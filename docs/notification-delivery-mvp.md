# Notification Delivery MVP

This document defines the first delivery slice after an ingress request has
been accepted. It is the contract between notification ingress persistence,
realtime fanout, and later delivery analytics.

## Contract boundary

`POST /api/v1/notifications` is an acceptance API. A `202 Accepted` response
means that Notify durably recorded the validated event and its delivery handoff
in one transaction. It does not mean that a browser received the notification,
that a socket was online, or that a later retry is guaranteed.

The handoff is one `notification_event_outbox` row for one accepted event. The
row carries the event id, environment, recipient id, event name, and dispatch
timestamps. Delivery work must consume this row rather than reconstructing a
delivery request from the public HTTP request.

The v1 handoff is:

```text
accepted request
  -> notification_events row
  -> notification_event_outbox row (pending)
  -> publisher claims the row (processing)
  -> publisher broadcasts to Phoenix PubSub
  -> row becomes published
```

The accepted event and outbox row are the durable boundary. PubSub and socket
connections are runtime delivery infrastructure only.

## Delivery model

V1 supports best-effort realtime delivery over Phoenix Channels and Phoenix
PubSub:

- connected, authorized clients may receive a notification while they are
  subscribed to its recipient topic;
- a successful `published` state means that the publisher handed the envelope
  to Phoenix PubSub, not that any client acknowledged or rendered it;
- an offline client is not promised replay, recovery, or eventual delivery;
- a notification event keeps a stable event id so future consumers can
  de-duplicate it;
- durable retry and redelivery semantics are deferred.

There is no delivery SLA, exactly-once guarantee, client acknowledgement, or
durable retry guarantee in v1.

## Recipient and topic boundary

The accepted event owns the recipient boundary. The public request supplies an
opaque `recipient.id`; it does not supply a tenant id, app id, channel name, or
arbitrary topic. The authenticated server API key resolves workspace, app, and
environment before the event is stored.

The exact v1 PubSub topic is:

```text
tenant:{workspace_id}:app:{notification_app_id}:environment:{app_environment_id}:recipient:{recipient_id}
```

The publisher derives every topic segment from the persisted event and its
trusted ownership scope. A client cannot choose or alter any topic segment.
Environment is mandatory so Development and Production notifications cannot
share a PubSub subscription when they use the same recipient id.
Topic names contain identifiers only and must not contain payload values,
secrets, email addresses, or other sensitive data.

Socket authentication derives the same workspace, app, environment, and
recipient scope from a short-lived verified socket token. A channel join is
rejected if the token does not authorize the requested environment and
recipient. Connection state remains local to the socket node; Phoenix PubSub
handles delivery across clustered nodes.

## Realtime envelope

The v1 socket event is `notification.created`. Its envelope is deliberately
small and contains only data needed to identify and render a notification:

```json
{
  "event": "notification.created",
  "data": {
    "eventId": "evt_01K1Y6R6KJ0W8QZ0B7X1M2N3P4",
    "notification": "invoice.payment_failed",
    "recipientId": "user_123",
    "occurredAt": "2026-08-02T05:00:00Z",
    "payload": {
      "invoiceId": "inv_123",
      "amountDue": 2400,
      "currency": "usd"
    },
    "metadata": {
      "source": "billing"
    }
  }
}
```

The envelope may include the validated event payload and safe scalar metadata
already accepted for the event. It must not include server API keys, auth
headers, idempotency keys, request fingerprints, database identifiers that are
not part of the delivery contract, or internal error details. Payload size and
validation limits remain those of the ingress contract. Clients must treat the
payload as untrusted caller-controlled data and must not assume a schema beyond
the event name's application-defined meaning.

The stable `eventId` is the only delivery identity. `notification.created` is a
publish event, not a receipt. A future HTTP inbox or detail API may expose
persisted event data, but v1 does not require that API for reconnect recovery.

## Minimum lifecycle state

The first iteration needs only these states and meanings:

| State        | Owner               | Meaning                                                                            |
| ------------ | ------------------- | ---------------------------------------------------------------------------------- |
| `accepted`   | ingress transaction | The validated event, idempotency record, and outbox handoff committed together.    |
| `pending`    | outbox              | The handoff is durable and has not been claimed for publication.                   |
| `processing` | publisher           | A delivery process has claimed the handoff and is attempting the PubSub broadcast. |
| `published`  | publisher           | PubSub accepted the broadcast request. This is not client delivery confirmation.   |

`accepted` is represented by the `notification_events` record and `pending`,
`processing`, and `published` are represented by the outbox status. V1 does not
add `delivered`, `acknowledged`, `failed`, `retrying`, or `expired` states.
Publish errors are operational failures to log and measure; they do not create
a stronger delivery promise or a new client-visible state in this slice.

Each processing claim has an owner token and renewable timestamp. The publisher
renews that lease while database or PubSub work is active. Stale recovery may
return only an expired lease to `pending`, and every completion or reset is
conditional on the claim token so an earlier publisher cannot mutate a newer
claim.

Later analytics may count accepted events and published handoffs separately.
It must not report `published` as delivered, successful, or acknowledged.

## Safe persistence and dashboard exposure

Server persistence follows the ingress privacy boundary. It may retain the
validated payload, safe metadata, event and recipient identifiers, ownership
scope, timestamps, payload size, and outbox status. Logs and metrics should use
event id, event name, ownership scope, and safe metadata, not raw payloads.

The dashboard may show event id, event name, recipient id, source kind,
accepted-at time, payload size, and the lifecycle state that is actually
available. It must not show raw server API keys, authorization headers, raw
idempotency keys, request fingerprints, or imply browser receipt from a
`published` state. Full payload display and durable browser caching remain out
of scope.

## Deferred boundaries

Explicitly deferred from delivery v1:

- durable retries, backoff, dead-letter handling, and redelivery;
- offline recovery, replay cursors, inbox reads, and reconnect synchronization;
- delivery receipts, client acknowledgements, unread counters, and per-device
  state;
- email, SMS, mobile push, SSE, and other non-WebSocket channels;
- arbitrary client-selected topics and cross-recipient fanout;
- delivery analytics rollups, billing counters, quotas, and SLA reporting;
- a central connection registry or targeted per-node routing.
