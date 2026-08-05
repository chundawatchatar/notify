# Notification Ingress MVP

This document is the source of truth for the notification ingress MVP contract.
It defines the public ingest endpoint, the authenticated dashboard boundary,
the minimum durable record shape, and the features that remain deferred.

## Goals

- accept backend-originated notification events through one stable public API
- authenticate requests with an environment-scoped server API key
- deduplicate safe client retries with explicit idempotency behavior
- persist enough accepted-event data to support later fanout and dashboard
  inspection
- let the dashboard show the endpoint contract, recent accepted events, and a
  minimal test-event action without exposing secrets

## Public Ingest Contract

Public ingest is owned by `apps/api` and is separate from authenticated
dashboard APIs.

### Endpoint

```text
POST /api/v1/notifications
```

### Required headers

- `Authorization: Bearer <server_api_key>`
- `Idempotency-Key: <opaque client-generated key>`
- `Content-Type: application/json`

The bearer credential is an environment-scoped server API key from the Security
module. The request body never carries workspace, app, or environment
identifiers. The API derives those from the authenticated key.

### Request body

```json
{
  "event": "invoice.payment_failed",
  "recipient": {
    "id": "user_123"
  },
  "payload": {
    "invoiceId": "inv_123",
    "amountDue": 2400,
    "currency": "usd"
  },
  "occurredAt": "2026-08-02T05:00:00Z",
  "metadata": {
    "source": "billing"
  }
}
```

### Required fields

- `event`: string event name in stable dot-case such as
  `invoice.payment_failed`
- `recipient.id`: opaque customer-owned recipient identifier
- `payload`: JSON object with the event-specific notification data

### Optional fields

- `occurredAt`: RFC 3339 UTC timestamp from the producer
- `metadata`: flat JSON object for safe tracing values

### Validation rules

- reject unknown top-level fields
- `event` must be 1-120 characters and match lowercase dot-case segments
- `recipient.id` must be a non-empty string up to 255 characters
- `payload` must be a JSON object and must not exceed the configured payload
  size limit
- `metadata`, when present, must be a JSON object with bounded scalar values
- `occurredAt`, when present, must be a valid RFC 3339 timestamp and must not
  be unreasonably far in the future

The MVP does not accept tenant ids, app ids, delivery channels, templates,
batch arrays, or arbitrary target topic names in the public request.

## Authentication

Server API keys are environment-scoped backend credentials. They authenticate
public ingest only.

- the key resolves one workspace, app, and environment
- the raw secret is shown only at create or rotate time
- persistence stores only the key digest and masked hint
- revoked keys fail authentication immediately
- invalid, revoked, or unknown keys return the same safe auth failure and do
  not reveal whether a workspace, app, or environment exists

The MVP does not add browser-facing ingress secrets. Client keys remain public
browser identifiers and must not authenticate `POST /api/v1/notifications`.

## Idempotency

`Idempotency-Key` is required on every public ingest request.

- scope the key to the authenticated environment
- retain the deduplication record for 24 hours
- compare the key against a canonical fingerprint of the request body
- a replay with the same key and same canonical request must not create a new
  accepted event
- the first accepted result is returned again for a duplicate replay
- a replay with the same key but a different canonical request returns
  `409 idempotency_key_conflict`

Canonical request fingerprinting uses serialization algorithm
`ingress-body-v1`:

- serialize only the validated JSON request body, not headers
- reject duplicate object members before converting JSON objects into maps or
  keyword lists; rejection applies to both exact duplicate names and names that
  collide after Unicode NFC normalization
- normalize all object-key strings to Unicode NFC before duplicate-key
  detection and reject any object whose normalized keys collide
- sort all object keys lexicographically by Unicode code point at every nesting
  level
- preserve array element order exactly as received
- normalize all strings to Unicode NFC before JSON escaping and UTF-8 encoding
- emit compact JSON with `,` between array or object elements and `:` between
  keys and values, with no insignificant whitespace anywhere
- escape strings exactly as JSON requires: quote, reverse solidus, and control
  characters use standard short escapes when available, otherwise `\u00XX`;
  other characters are emitted as UTF-8 after NFC normalization
- parse numeric input into an exact base-10 decimal representation before
  canonicalization; reject any numeric token that cannot be represented without
  precision loss, overflow, or underflow in the chosen exact-decimal parser
- render integers and decimals in canonical decimal form:
  `1`, `1.0`, and `1e0` serialize as `1`; exponent notation is never emitted;
  fractional values keep only the minimum decimal digits required to preserve
  value with no trailing zeroes; `-0` serializes as `0`; no rounding is
  allowed at canonicalization time because non-exact numeric inputs must be
  rejected earlier
- omit no validated fields and add no derived fields
- hash the resulting byte sequence with SHA-256 and store the lowercase
  hexadecimal digest
- compare only fingerprints created with the same algorithm version

If a future version changes canonicalization, the stored fingerprint version
must be persisted beside the fingerprint and comparisons must use matching
versions only.

The retention window is an MVP assumption, not a long-term guarantee.

## Success And Error Responses

### First accepted request

Return `202 Accepted`.

```json
{
  "data": {
    "eventId": "evt_01K1Y6R6KJ0W8QZ0B7X1M2N3P4",
    "duplicate": false,
    "acceptedAt": "2026-08-02T05:00:01Z"
  }
}
```

### Duplicate replay

Return `200 OK` with the original accepted event id and timestamp.

```json
{
  "data": {
    "eventId": "evt_01K1Y6R6KJ0W8QZ0B7X1M2N3P4",
    "duplicate": true,
    "acceptedAt": "2026-08-02T05:00:01Z"
  }
}
```

### Safe failure shape

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Request validation failed.",
    "details": [
      {
        "field": "event",
        "issue": "must use dot-case"
      }
    ]
  }
}
```

### MVP error rules

- use stable client-safe codes such as `unauthorized`, `invalid_request`,
  `payload_too_large`, and `idempotency_key_conflict`
- do not return stack traces, SQL messages, raw secrets, request fingerprints,
  or tenant existence hints
- reject unsupported media types with `415`
- reject malformed JSON with `400`
- reject invalid or revoked server API keys with `401`

## Durable Record Shape

The MVP writes durable records for accepted requests before any downstream
fanout exists.

### `notification_events`

One row per accepted event with:

- stable event id
- workspace id, app id, and environment id
- optional source server API key id
- source kind: `public_api` or `dashboard_test`
- event name
- recipient id
- canonical payload JSON
- optional metadata JSON
- occurred-at timestamp
- accepted-at timestamp
- payload size in bytes

Persistence and privacy rules for `notification_events`:

- workspace, app, and environment ownership remain the only access path for
  reading or deleting an event
- caller-controlled payload JSON is retained for 30 days in MVP, after which
  the ingress data-retention job owned by `apps/api` deletes or redacts the
  persisted payload and metadata fields by event age
- payload and metadata columns must use the repository's standard database
  encryption-at-rest posture
- the ingress API must reject requests before fingerprinting, canonical payload
  generation, and persistence when payload or metadata contains caller-supplied
  secrets, credentials, bearer tokens, API keys, passwords, cookies,
  authorization headers, or other request-auth material
- sensitive-field detection uses a deterministic, versioned detector applied to
  arbitrary JSON values before fingerprinting, canonicalization, or
  persistence; it recursively inspects nested objects, arrays, scalar values,
  and otherwise unclassified content and fails closed when content cannot be
  classified safely
- the detector matches reserved or configured field names after Unicode NFC
  normalization at any nesting depth, including generic containers such as
  `data`, and may reject scalar or array content when their surrounding key
  path or content classification is sensitive
- the sanitization rule set version must be fixed for the request lifecycle so
  the validated, fingerprinted, and persisted representations cannot diverge
- later event-detail APIs must support field-level redaction before showing
  caller-controlled payload content in the dashboard
- logs, audit events, and metrics may reference the stable event id and safe
  metadata only, not raw payload bodies by default

### `notification_ingress_idempotency_keys`

One row per retained idempotency key with:

- environment id
- idempotency-key digest
- canonical request fingerprint
- canonical request fingerprint version, initially `ingress-body-v1`
- accepted event id
- expires-at timestamp

The database enforces `UNIQUE (environment_id, idempotency_key_digest)`.

### `notification_event_outbox`

One row per accepted event for future fanout handoff with:

- accepted event id
- environment id
- recipient id
- event name
- next dispatch status, initially `pending`
- available-at timestamp
- created-at timestamp

The idempotency record, accepted event, and outbox row are inserted in one
transaction before the API returns the first `202 Accepted` response.

On a concurrent `UNIQUE (environment_id, idempotency_key_digest)` conflict, the
API reloads the existing idempotency row inside the conflict path, compares the
stored fingerprint and fingerprint version with the current request, returns the
stored accepted response when they match, and returns
`409 idempotency_key_conflict` when they differ. The API must not surface the
raw database uniqueness error to clients.

The outbox exists so later delivery work can consume a stable handoff record
without redefining ingress persistence. The MVP does not yet perform retries,
worker orchestration, receipts, or analytics rollups from this record.

## Dashboard Boundary

The dashboard surface is authenticated product behavior, not part of the public
ingest contract.

### Route context

- browser navigation stays at `/w/:workspaceSlug/ingress`
- the selected app and environment use route search state with slugs
- backend dashboard APIs use the resolved `:appId` and `:environmentId` UUIDs

### Minimum dashboard behavior

- show the public ingest endpoint path and auth requirements for the selected
  environment
- show masked server API key metadata or setup state, never the raw secret
- show the idempotency window and request validation rules
- list recent accepted-event summaries for the selected environment
- show the planned authenticated test-event action and its contract boundary

### Authenticated dashboard APIs

The follow-on authenticated APIs should stay separate from
`POST /api/v1/notifications`:

- `GET /api/apps/:appId/environments/:environmentId/ingress`
- `GET /api/apps/:appId/environments/:environmentId/ingress/events`
- `POST /api/apps/:appId/environments/:environmentId/ingress/test-events`

The planned dashboard test-event action uses the authenticated workspace member
and the selected app and environment UUIDs. It does not require the browser to
know or send the environment's raw server API key.

Its follow-on behavior is:

- require normal authenticated dashboard authorization for the selected
  workspace, app, and environment
- accept a minimal validated synthetic event body and create an accepted event
  with source kind `dashboard_test`
- use server-side deduplication semantics defined for the action itself rather
  than reusing the public `Idempotency-Key` header contract from
  `POST /api/v1/notifications`
- return the same safe validation and authorization failure shapes used by
  other authenticated dashboard APIs
- treat replay-conflict handling as planned work owned by the follow-on
  implementation ticket, not as implicit browser behavior

## Safe Data Rules

### Safe to persist server-side

- canonical event payload JSON
- normalized event name and recipient id
- masked server API key hint and server-side key digest
- idempotency-key digest and request fingerprint
- accepted-event and outbox timestamps and status metadata

Server-side payload persistence must keep the same privacy boundary defined for
`notification_events`: tenant-scoped access only, retention-based deletion,
database encryption-at-rest, and redaction before any later operator-facing
display of caller-controlled payload content.

### Safe to display in the dashboard

- event id
- event name
- recipient id
- source kind
- accepted-at timestamp
- payload size
- duplicate indicator when the API reports a replay
- masked key metadata and setup state

### Never display or persist in browser storage

- raw server API key secrets
- `Authorization` headers
- raw idempotency keys
- full request fingerprints
- full accepted-event payload JSON by default

Safe event summaries may live in in-memory query state, but secret-bearing data
must not be written to local storage, session storage, IndexedDB, URL state, or
durable browser caches.

## Deferred From The MVP

The ingress MVP does not include:

- realtime fanout execution
- retry orchestration or dead-letter handling
- delivery attempts or receipts
- per-tenant analytics rollups
- billing counters or plan enforcement
- batch ingest
- arbitrary client-selected topics
- browser-authenticated public ingest
