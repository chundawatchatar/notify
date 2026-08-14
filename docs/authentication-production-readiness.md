# Authentication Production Readiness

This document is the implementation contract for exposing Notify dashboard
authentication to the public internet. It fixes the scope and ordering for
authentication rate limiting and production transactional email delivery.

## Decision

Authentication must remain private until both controls below are implemented
and the public-exposure checklist in this document passes:

1. Redis-backed rate limiting protects the unauthenticated authentication
   endpoints listed below.
2. Postmark delivers verification, password-reset, and invitation email through
   a production-only provider adapter.

NFY-56 and NFY-57 may be implemented in parallel after this contract. Neither
ticket changes the credential, session, invitation, or password-reset lifecycle
defined in `docs/authentication.md`.

Google OAuth, logout from all devices, MFA, passkeys, social login, adaptive
risk scoring, CAPTCHA, account lockout, and broader authorization work remain
deferred. They are not public-exposure dependencies for the current email and
password flow.

## Rate-Limited Endpoint Scope

NFY-56 must protect these endpoints before they are publicly exposed. A request
must pass every budget that applies to it.

| Endpoint group               | Endpoints                                                                                                                                                                                                                                   | Budgets                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Email dispatch               | `POST /api/auth/signup`, `POST /api/auth/email-verification/resend`, `POST /api/auth/password-reset`                                                                                                                                        | 10 requests per 10 minutes per client IP and 3 requests per hour per normalized email and action            |
| Password login               | `POST /api/auth/login`                                                                                                                                                                                                                      | 20 attempts per 5 minutes per client IP and 5 attempts per 15 minutes per normalized email                  |
| One-time credential exchange | `POST /api/auth/signup/complete`, `POST /api/auth/email-verification/confirm`, `POST /api/auth/password-reset/confirm`, `POST /api/auth/password-reset/complete`, `POST /api/auth/invitations/resolve`, `POST /api/auth/invitations/signup` | 30 attempts per 5 minutes per client IP and 5 attempts per 15 minutes per credential fingerprint and action |
| Session refresh              | `POST /api/auth/refresh`                                                                                                                                                                                                                    | 120 attempts per 5 minutes per client IP and 30 attempts per 5 minutes per session ID                       |

The email budgets are evaluated before account lookup and use the normalized
request email even when no account exists. Password-reset responses therefore
remain enumeration-safe. Credential fingerprints are keyed hashes of the raw
one-time credential; raw credentials, email addresses, and refresh secrets must
not appear in Redis keys, metrics, or logs.

`DELETE /api/auth/session` remains available so a client can revoke its current
session. Authenticated endpoints such as `GET /api/auth/me`, invitation
acceptance, and workspace switching are outside the first limiter phase because
they already require a valid session. Their authorization behavior does not
change.

### Limiter Behavior

- Use Redis as the shared production store so every API replica observes the
  same counters. Counters must expire automatically and updates must be atomic.
- Namespace keys by deployment environment and endpoint action. Do not share
  production counters with development, test, or another deployment.
- Resolve the client IP only through the deployment's trusted proxy chain.
  Forwarded headers from untrusted peers must not override the socket address.
- Return HTTP `429` with the existing JSON error envelope, the stable code
  `rate_limited`, and an integer `Retry-After` header in seconds. Do not expose
  the exhausted key or whether an account, session, or credential exists.
- A Redis failure must not silently bypass a required limit. Return HTTP `503`
  with the stable code `rate_limiter_unavailable`; retain the current safe
  response semantics and do not run password hashing, token consumption, or
  email delivery after the limiter fails.
- Emit bounded metrics by endpoint action and outcome only. Logs may contain the
  request ID and action, but not raw limiter keys or credential material.

Production requires `REDIS_URL` and a deployment-specific
`AUTH_RATE_LIMIT_NAMESPACE`. Once the limiter is enabled, API readiness must
include Redis connectivity because public authentication is unsafe without the
shared limiter.

## Production Email Contract

NFY-57 must retain the existing `VerificationEmail`, `PasswordResetEmail`, and
`InvitationEmail` boundaries and replace only their production disabled
adapters. Production delivery uses Postmark's HTTPS API through one shared
transport adapter. Development continues to use Mailpit over SMTP, and tests
continue to use the current process adapters.

The production runtime contract is:

| Variable                | Requirement                                                                |
| ----------------------- | -------------------------------------------------------------------------- |
| `AUTH_EMAIL_PROVIDER`   | Required in production and fixed to `postmark` for this implementation     |
| `POSTMARK_SERVER_TOKEN` | Required secret used only by the production adapter                        |
| `AUTH_EMAIL_FROM`       | Required verified sender address used for all auth and invitation messages |
| `AUTH_EMAIL_REPLY_TO`   | Optional monitored reply address; omit to send without a reply-to header   |
| `WEB_APP_URL`           | Existing required HTTPS dashboard origin used to build one-time links      |

Production startup must fail when the provider name is unsupported or any
required provider setting is missing or blank. Provider credentials belong in
the deployment secret and must never be committed, logged, returned in an API
response, or included in metrics.

The adapter must:

- send verification, password-reset, and invitation messages with distinct
  subjects and provider tags while preserving the current link paths and token
  lifetimes;
- treat only a confirmed provider acceptance as success and map timeouts,
  transport failures, authentication failures, and rejected messages to the
  existing adapter error boundary;
- use bounded connect and request timeouts and avoid automatic request-path
  retries that could create duplicate messages;
- log only safe delivery metadata such as message kind, provider response ID,
  outcome, and request ID; never log recipient addresses or one-time links;
- expose bounded delivery attempt and outcome metrics by message kind, without
  recipient or provider-response labels.

Callers retain their current HTTP and transaction behavior when delivery
succeeds or fails. This ticket does not add an email outbox, background retry,
bounce webhook, suppression management, or marketing email. Those require
separate contracts if provider-console monitoring proves insufficient.

## Implementation Sequence

1. NFY-56 implements the limiter, runtime validation, Redis-aware readiness,
   stable error response, focused allow/reject/boundary tests, and the matching
   `.env.example` and operations documentation.
2. NFY-57 implements the Postmark adapter and configuration, keeps Mailpit
   unchanged, adds focused success/failure/configuration tests, and documents
   provider setup and secret ownership.
3. NFY-58 verifies the combined deployed behavior and updates the final
   operator documentation before public routing is enabled.

NFY-56 and NFY-57 must not alter access-token claims, refresh rotation, cookie
flags, allowed-origin checks, invitation consumption, password-reset
enumeration safety, challenge lifetimes, or session revocation behavior.

## Public-Exposure Checklist

Public authentication is ready only when all of these statements are true and
recorded by NFY-58:

- NFY-56 and NFY-57 are deployed in the same immutable API image.
- Every endpoint in the rate-limit table has focused allow, reject, reset, and
  shared-store coverage, including enumeration-safe password reset behavior.
- Production rejects startup without valid limiter and email-provider settings.
- API readiness fails when the required Redis connection is unavailable.
- The deployment trusts forwarded client IPs only from the configured ingress
  path, and a request cannot evade a budget with a spoofed forwarded header.
- The Postmark sender domain is verified with SPF and DKIM, DMARC policy is
  published, and the production sender and reply address are monitored.
- Verification, password-reset, and invitation messages are delivered from the
  deployed production adapter, and their one-time links target the exact
  configured HTTPS `WEB_APP_URL`.
- Provider rejection and timeout paths preserve current safe API behavior and
  expose actionable logs and bounded metrics without sensitive data.
- `CORS_ORIGINS` contains the exact dashboard origin, refresh cookies are
  `Secure`, and no development Mailpit endpoint is reachable from production.
- Google OAuth and the other deferred authentication work remain disabled and
  are not presented as production-ready features.
