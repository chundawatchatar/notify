# Domain Architecture

This document describes the intended public domain layout for Notify. Replace
`notify.tld` with the final purchased product domain when the brand is chosen.

## Goals

- Keep marketing, application, API, documentation, and realtime traffic on
  clear subdomains.
- Use predictable staging hostnames that mirror production.
- Avoid mixing browser app cookies with API/realtime concerns unnecessarily.
- Make DNS, TLS, CORS, and cookie rules easy to reason about.

## Production Domains

| Host              | Purpose                                        | Owner                                  |
| ----------------- | ---------------------------------------------- | -------------------------------------- |
| `notify.tld`      | Portfolio/marketing website                    | `apps/marketing`                       |
| `www.notify.tld`  | Optional redirect to `notify.tld`              | Edge/router                            |
| `app.notify.tld`  | Main dashboard web app                         | `apps/web`                             |
| `api.notify.tld`  | Public API for customer backends and dashboard | `apps/api`                             |
| `live.notify.tld` | WebSocket/SSE realtime endpoint                | realtime gateway, initially `apps/api` |
| `docs.notify.tld` | Product and API documentation                  | docs site                              |

## Staging Domains

| Host                      | Purpose                               |
| ------------------------- | ------------------------------------- |
| `staging.notify.tld`      | Staging marketing website             |
| `staging.app.notify.tld`  | Staging dashboard web app             |
| `staging.api.notify.tld`  | Staging API                           |
| `staging.live.notify.tld` | Staging WebSocket/SSE endpoint        |
| `staging.docs.notify.tld` | Staging documentation site, if needed |

The staging shape intentionally mirrors production so configuration bugs are
easier to catch before release.

## Local Development Domains

Local development can use ports instead of local DNS:

| Local URL                    | Purpose                   |
| ---------------------------- | ------------------------- |
| `http://localhost:3200`      | marketing website         |
| `http://localhost:3100`      | dashboard web app         |
| `http://localhost:4100`      | API and realtime endpoint |
| `postgres://localhost:15432` | PostgreSQL                |
| `redis://localhost:16379`    | Redis                     |

If browser cookie or CORS behavior needs to match production more closely, add
local hostnames later:

```text
notify.localhost
app.notify.localhost
api.notify.localhost
live.notify.localhost
docs.notify.localhost
```

Do not add local DNS complexity until we need it.

## Service Boundaries

### Portfolio Website

Host:

```text
notify.tld
www.notify.tld
```

Responsibilities:

- product landing pages
- pricing pages
- public marketing content
- links into dashboard and docs

This should not depend on the realtime system.

### Dashboard App

Host:

```text
app.notify.tld
```

Responsibilities:

- signup and login
- subscription management
- organization settings
- notification logs
- API key generation
- application/project management
- template and channel configuration

The dashboard calls `api.notify.tld` and connects to `live.notify.tld`.

### API

Host:

```text
api.notify.tld
```

Responsibilities:

- customer backend API
- dashboard API
- authentication endpoints
- API key management
- notification ingest
- notification log reads
- subscription and billing APIs

Current health endpoints:

```text
GET https://api.notify.tld/api/health/ready
GET https://api.notify.tld/api/version
```

### Realtime

Host:

```text
live.notify.tld
```

Responsibilities:

- WebSocket connections
- future SSE streams, if needed
- realtime notification delivery
- client connection authentication

In v1, `live.notify.tld` can route to the Phoenix API app because API and
Channels live together. Later, the same hostname can route to a separate
realtime gateway without changing client URLs.

Recommended client endpoint:

```text
wss://live.notify.tld/socket
```

### Documentation

Host:

```text
docs.notify.tld
```

Responsibilities:

- API docs
- SDK docs
- integration guides
- changelog
- status and operational docs if public

Docs should be deployable independently from the application.

## Cookie And Auth Guidance

Prefer explicit tokens for API and realtime auth instead of relying on broad
cross-subdomain cookies.

Recommended approach:

- Dashboard access uses a short-lived bearer JWT issued by `api.notify.tld`.
- Dashboard refresh uses a rotating HttpOnly cookie scoped to
  `api.notify.tld/api/auth`; the API stores only its digest.
- API keys authenticate customer backend requests to `api.notify.tld`.
- Short-lived socket tokens authenticate clients to `live.notify.tld`.
- Avoid setting cookies on `.notify.tld` unless a clear cross-subdomain use case
  exists.

The dashboard sends refresh requests with credentials from the exact allowed
app origin. Protected API requests also validate the persisted session and
workspace membership named by the JWT. This keeps marketing, dashboard, API,
and realtime boundaries clean while supporting immediate revocation.

## CORS And Origins

Production allowed origins:

```text
https://notify.tld
https://www.notify.tld
https://app.notify.tld
https://docs.notify.tld
```

Staging allowed origins:

```text
https://staging.notify.tld
https://staging.app.notify.tld
https://staging.docs.notify.tld
```

Realtime origin checks should allow:

```text
https://app.notify.tld
https://staging.app.notify.tld
```

Do not use wildcard CORS for authenticated API routes.

## DNS And TLS

Recommended DNS shape:

- apex `notify.tld` points to the marketing hosting provider
- `www.notify.tld` redirects to apex
- `app.notify.tld` points to the web app hosting target
- `api.notify.tld` points to the API load balancer
- `live.notify.tld` points to the realtime load balancer
- `docs.notify.tld` points to the docs hosting target

Recommended TLS:

- use managed certificates per environment
- include staging hostnames in staging certificates
- ensure WebSocket upgrades work through the TLS/load-balancer layer

## Deployment Mapping

Production:

```text
notify.tld       -> marketing deployment
app.notify.tld   -> dashboard deployment
api.notify.tld   -> API deployment
live.notify.tld  -> realtime endpoint, initially API deployment
docs.notify.tld  -> docs deployment
```

Staging:

```text
staging.notify.tld       -> staging marketing deployment
staging.app.notify.tld   -> staging dashboard deployment
staging.api.notify.tld   -> staging API deployment
staging.live.notify.tld  -> staging realtime endpoint
staging.docs.notify.tld  -> staging docs deployment
```

## Open Questions

- What final product domain will replace `notify.tld`?
- Should `www.notify.tld` serve content or always redirect to the apex?
- Should docs be public from day one?
- Will realtime v1 expose only WebSocket, or WebSocket plus SSE?
- Which provider will host marketing and docs?
- Which load balancer will terminate TLS for API and realtime?

## Recommendation

Use this initial domain model:

```text
notify.tld
app.notify.tld
api.notify.tld
live.notify.tld
docs.notify.tld
```

Mirror it in staging with `staging.` prefixes:

```text
staging.notify.tld
staging.app.notify.tld
staging.api.notify.tld
staging.live.notify.tld
staging.docs.notify.tld
```

Keep `live.notify.tld` separate even if it initially routes to the same Phoenix
app as `api.notify.tld`. That gives us room to split the realtime gateway later
without changing client integration URLs.
