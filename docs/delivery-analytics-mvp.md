# Delivery Analytics MVP

This document defines the metric and query contract for the first delivery
analytics dashboard. It is the source of truth for the aggregation, API, and
dashboard work that follows. The underlying ingress and delivery meanings stay
defined in `docs/notification-ingress-mvp.md` and
`docs/notification-delivery-mvp.md`.

## Contract Boundary

The MVP measures accepted notification events and their best-effort handoff to
Phoenix PubSub. It does not measure client receipt or end-user engagement.

The durable source concepts are:

- one `notification_events` row for one accepted event;
- one `notification_event_outbox` row for that event;
- `accepted_at` as the event cohort timestamp;
- outbox status `pending`, `processing`, or `published` as the handoff state;
- `published_at` as the time PubSub accepted the broadcast request.

An idempotent replay does not create another event and therefore does not add to
any analytics count. Both `public_api` and `dashboard_test` accepted events are
included in the MVP because both enter the same real delivery path. Source-kind
filtering and breakdowns are not part of the MVP.

`published` must be labelled as published or PubSub handoff. It must never be
labelled delivered, successful, received, acknowledged, or rendered.

## Scope And Time

Every analytics query is authorized through the current membership-scoped
workspace session. The workspace is mandatory and is never accepted from an
untrusted query parameter.

The MVP supports:

- a workspace total across all of its app environments;
- an app breakdown within that workspace;
- an optional app and environment selection for a narrower view.

App and environment identifiers must resolve through the authorized workspace.
A request cannot select an environment without its owning app.
A valid identifier from another workspace returns the same not-found result as
an unknown identifier. Workspace totals continue to include retained events
from an archived app so archiving an app does not rewrite historical results.

The supported windows are:

| Window | Duration | Trend bucket |
| ------ | -------- | ------------ |
| `24h`  | 24 hours | 1 hour       |
| `7d`   | 7 days   | 1 day        |
| `30d`  | 30 days  | 1 day        |

The server captures one `as_of` UTC timestamp at the start of a query. The
window is the half-open interval `[as_of - duration, as_of)`, and events enter
the cohort by `accepted_at`. Trend buckets are consecutive half-open UTC
intervals anchored at the window start. The API returns bucket boundaries as
RFC 3339 UTC timestamps and returns zero-valued buckets when no event was
accepted in an interval.

All totals, app rows, and trend buckets in one response use the same scope,
window, and `as_of`. Callers cannot supply arbitrary dates or bucket sizes in
the MVP. Retention policy is not yet implemented, so the API must not imply that
older windows are permanently available.

## Metric Definitions

Counts use distinct accepted event ids. The one-to-one outbox relation means an
event contributes to exactly one current handoff-state count.

| Metric           | Definition                                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Accepted         | Events with `accepted_at` inside the query window.                                                                                       |
| Pending          | Accepted events whose outbox is currently `pending`. This includes a handoff returned to pending after a publish error or expired claim. |
| Processing       | Accepted events whose outbox is currently `processing`.                                                                                  |
| Published        | Accepted events whose outbox is currently `published`. PubSub accepted the broadcast, but client receipt is unknown.                     |
| Unpublished      | `pending + processing`. This is a derived handoff backlog, not a failure count.                                                          |
| Publication rate | `published / accepted`. It is `null` when accepted is zero.                                                                              |

For a complete response, the invariant is:

```text
accepted = pending + processing + published
```

The API should return integer counts and the publication-rate numerator and
denominator. A UI may format a percentage, but rounded display values must not
become the contract or the input to another calculation.

Status is evaluated at `as_of`, not frozen when the event first enters its time
bucket. A recent or historical cohort can therefore move from pending or
processing to published between queries. Accepted count is stable once the
window closes, while handoff counts and publication latency can still converge.

## Publication Latency

Publication latency measures the durable delivery handoff only:

```text
publication_latency_ms = published_at - accepted_at
```

The latency population contains only accepted events in the query cohort whose
current status is `published` and whose `published_at` is present. Pending and
processing events are not assigned a synthetic latency and are not included as
zeroes.

The MVP returns:

- published sample count;
- p50 publication latency in integer milliseconds;
- p95 publication latency in integer milliseconds.

Percentiles use the nearest-rank definition over ascending latency values:
rank `ceil(percentile * sample_count)`, using a one-based rank. Both percentile
values are `null` when the sample count is zero. The MVP does not define average,
maximum, ingest-request latency, PubSub-to-socket latency, or end-to-end client
latency.

## Failure And Retry Semantics

The current delivery model has no terminal failed state and no persisted
attempt history. A publish error or expired processing lease returns the outbox
row to `pending`. Its current row cannot show whether it has never been claimed,
failed once, failed repeatedly, or recovered after a stale claim.

Therefore the MVP must not expose:

- failed or failure-rate metrics;
- retry or retried-event counts;
- attempt counts or retry latency;
- dead-letter counts;
- delivery SLA or SLA-compliance metrics.

Operational telemetry may count publisher errors and stale-claim recovery, but
those process metrics are not durable event analytics and must not be joined to
dashboard event counts. Retry and failure analytics require a future persisted
attempt or terminal-outcome model.

## Response Shape Requirements

The later HTTP contract may choose endpoint names, but one analytics response
must provide enough typed data for:

- the selected window and server `as_of` timestamp;
- workspace totals for every MVP count and publication latency value;
- ordered zero-filled trend buckets with the same count fields;
- one row per app represented in the cohort, with app identity, display name,
  archival state, counts, publication rate inputs, and latency values;
- the applied app and environment filter, when present.

App rows are ordered by accepted count descending, then stable app id ascending
for ties. Trend buckets are ordered by start time ascending. Empty windows
return zero counts, a `null` publication rate, `null` latency percentiles, an
empty app breakdown, and the full set of zero-valued time buckets.

Aggregates may be computed from source rows or maintained in new persistence,
but their observable results must match this contract. Implementations must not
read payload or metadata values to calculate MVP metrics.

## Privacy And Authorization

Analytics responses may contain aggregate counts, timestamps, app identity and
display metadata, and latency values. They must not expose event payloads,
recipient ids, raw idempotency keys, request fingerprints, API key material, or
internal publish errors.

The existing `view_events` permission is the read boundary for delivery
analytics. Every source query and aggregate row must retain workspace scope.
App and environment filters narrow that scope and never replace the workspace
authorization check.

## Deferred Ownership

Later delivery work must own:

- a durable attempt model, scheduled retry policy, backoff, limits, and
  dead-letter outcomes;
- terminal failure semantics and retry analytics;
- client acknowledgements, receipts, per-device state, offline recovery, and
  end-to-end delivery latency;
- explicit service objectives before any SLA-compliance view exists;
- channels other than realtime PubSub.

Later billing work must define its own billable event, duplicate, test-event,
plan-period, quota, adjustment, and reconciliation rules. Analytics accepted or
published counts are operational product metrics and must not be reused as
billing counters without that contract.

Later reporting work must own arbitrary date ranges, timezone-aware calendar
periods, exports, scheduled reports, long-term retention guarantees, event-name
or recipient segmentation, comparisons, and cross-workspace reporting.
