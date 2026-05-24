# API Reference

This document describes the public contract exposed by the Express backend. It is intended for development, QA and academic review. Secrets, service-role keys and provider credentials must never be sent from the browser.

Base local URL:

```text
http://localhost:4000
```

## Authentication

User-facing protected endpoints require a Supabase access token:

```http
Authorization: Bearer <supabase_access_token>
```

The CMS sync endpoint uses a server-to-server bearer token configured with `CMS_SYNC_TOKEN`.

Stripe webhooks are protected by Stripe signature verification through the `stripe-signature` header.

## Common Error Model

The backend returns concise public errors:

```json
{
  "error": "Public error message."
}
```

Some video-access responses also include a safe machine-readable `code`, for example:

```json
{
  "error": "No se pudo resolver el acceso al video.",
  "code": "course_not_purchased"
}
```

Internal errors are logged server-side with contextual English messages. The public response must not expose stack traces, provider secrets, SQL details or private storage paths.

## Health

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | No | Basic backend health check. |

Response:

```json
{
  "status": "ok"
}
```

The health response is intentionally minimal and must not expose runtime details, provider configuration or server timestamps.

## Stripe Checkout

### Create Checkout Session

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/stripe/create-checkout-session` | User token + verified email | Creates a Stripe Checkout session for a single course purchase. |

Request:

```json
{
  "courseId": "uuid",
  "returnPath": "/courses/course-slug"
}
```

Rules:

- The frontend sends only the course identifier.
- The backend reads price, title and publication state from Supabase.
- A verified email is required before purchase.
- If a paid purchase already exists, the endpoint returns `409`.
- If an open pending Stripe session exists, it can be reused.

Success response:

```json
{
  "id": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### Checkout Session Status

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/stripe/checkout-session-status?session_id=...` | User token + verified email | Confirms payment status and repairs course access if needed. |

Rules:

- The session must belong to the authenticated user.
- A paid session grants or confirms access to the purchased course.
- Unknown or foreign sessions return a safe error.

Success response:

```json
{
  "status": "paid",
  "sessionId": "cs_test_...",
  "courseId": "uuid",
  "accessGranted": true
}
```

### Stripe Webhook

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/stripe/webhook` | Stripe signature | Processes payment events and updates purchase state. |

Handled events:

- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`
- `charge.refunded`
- `charge.dispute.created`

The webhook is idempotent through the `stripe_events` table.

## Lesson Video Access

### Resolve Lesson Video URL

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/lessons/:lessonId/video-url` | Optional for preview, required for paid lessons | Returns a protected playback path or a public preview URL. |

Headers for paid content:

```http
Authorization: Bearer <supabase_access_token>
x-syc-device-id: <device_uuid>
```

Rules:

- Free preview lessons can be resolved without purchase.
- Paid lessons require verified user, paid course access and a valid device id.
- Private Supabase Storage signed URLs are not returned directly to the browser.
- The backend returns a temporary internal playback path.

Success response for proxied video:

```json
{
  "path": "/api/lessons/playback/<token>",
  "expiresInSeconds": 900,
  "source": "proxied"
}
```

Success response for HLS:

```json
{
  "path": "/api/lessons/hls/<token>/manifest",
  "expiresInSeconds": 900,
  "source": "hls"
}
```

### Proxied Playback

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/lessons/playback/:token` | Playback token | Streams a protected video object from private storage. |

Supports HTTP range requests and returns `206` for partial playback when requested by the video player.

### HLS Playback

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/lessons/hls/:token/manifest` | Playback token | Serves a rewritten HLS manifest. |
| `GET` | `/api/lessons/hls/:token/resource?path=...` | Playback token | Serves protected HLS playlists or segments. |

Rules:

- HLS resource paths are constrained to the root manifest directory.
- Path traversal attempts are rejected.
- Playlists and segments remain behind backend access checks.

## Course Resources

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/course-resources/:resourceId/view-url` | Optional for preview, required for paid resources | Returns a short-lived platform view path or a safe public preview URL. |
| `GET` | `/api/course-resources/view/:token` | Resource token | Serves a private resource through the backend with inline disposition. |

Rules:

- Free preview resources can be resolved without purchase.
- Paid resources require a verified user and paid course access.
- Paid resources must reference the private Supabase Storage bucket `course-resources` through `resourceStoragePath`.
- Public Strapi upload URLs or external URLs are allowed only for intentionally shareable preview resources.
- Private Supabase Storage signed URLs are not returned directly to the browser.
- The backend serves private resources with `Content-Disposition: inline`; the UI presents them as in-page course material.
- Inline private resources can be embedded only by the configured frontend origins through `frame-ancestors`.

Success response:

```json
{
  "path": "/api/course-resources/view/<token>",
  "expiresInSeconds": 300,
  "source": "protected_resource"
}
```

## Video Devices

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/video-devices` | User token + verified email | Lists the current user's video devices. |
| `POST` | `/api/video-devices/:deviceId/revoke` | User token + verified email | Revokes one device owned by the current user. |

Rules:

- Device identifiers are stored as hashes, not in plain text.
- The current device cannot be revoked from itself.
- Revoked devices cannot continue accessing paid video.
- The number of active devices is capped by backend configuration.

## CMS Sync

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/cms/sync` | `CMS_SYNC_TOKEN` | Synchronizes published Strapi content into Supabase. |

Accepted models:

- `course`
- `lesson`
- `course_resource`
- `event`
- `home_content`
- `faq`
- `in_person_class`

Accepted actions:

- `upsert`
- `delete`

Delete actions are implemented as soft publication changes. User purchases and progress records are not deleted by CMS actions.

## Diagnostic Endpoint

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/supabase-test` | No | Local Supabase diagnostic endpoint. |

This endpoint exists only outside production when `ENABLE_SUPABASE_TEST_ENDPOINT=true`. In production it is disabled by code even if the environment variable is set.

## Security Notes

- CORS must be restricted with `CORS_ORIGINS` in production.
- Stripe secrets, Supabase service-role keys and SMTP credentials stay server-side.
- Public browser code only receives public Supabase anon keys and safe backend URLs.
- Backend logs may include technical context, but public responses stay concise.
- Private video delivery relies on purchase checks, short-lived playback tokens, device limits, HLS rewriting and backend proxying.
- Private course resources rely on purchase checks, short-lived resource tokens, backend proxying and inline rendering. This reduces link sharing but does not claim browser-level DRM.
