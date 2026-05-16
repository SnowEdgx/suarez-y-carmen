# Strapi CMS Integration

## Purpose

Strapi is added as an editorial CMS for non-technical content management. It does not replace the existing backend, authentication, payments, access control or private video delivery.

Operational responsibility stays split as follows:

- Next.js renders the public site and learner experience.
- Express handles secure business operations, Stripe, webhooks and signed video URLs.
- Supabase stores users, purchases, progress, operational course access and private storage.
- Strapi lets the artists manage editorial course, lesson, event and public-page content from an admin panel.

## Local URLs

- Strapi admin: `http://localhost:1337/admin`
- Backend sync endpoint: `POST http://localhost:4000/api/cms/sync`
- Strapi database: local Docker Postgres on host port `5433`

## Content Types

Strapi currently defines these editorial content types:

- `Course`: title, slug, description, level, price, cover and publication state.
- `Lesson`: course relation, title, description, order, duration, preview flag and `videoStoragePath`.
- `Event`: title, city, date, type, image and external links.
- `Home Content`: editable hero copy and CTAs.
- `FAQ`: editable public questions and answers.
- `In-person Class`: editable regular class information.

Only `Course`, `Lesson` and `Event` are synced into Supabase in this block because they are already part of the operational product model.

## Sync Model

Strapi sends editorial changes to the Express backend through `POST /api/cms/sync`.

The endpoint is protected with a shared `CMS_SYNC_TOKEN` and accepts only:

- `course`
- `lesson`
- `event`

Delete operations are handled as soft publication changes:

- Deleting or unpublishing a course sets `courses.is_published = false`.
- Deleting or unpublishing a lesson sets `lessons.is_published = false`.
- Deleting or unpublishing an event sets `events.is_active = false`.

This avoids destroying user purchases or progress records.

Published updates are also synced. If Strapi saves a draft without a published document, the middleware skips the sync because the public website must only consume published content.

The Strapi middleware logs backend sync errors without rolling back the editor action. This avoids blocking non-technical users when the backend is temporarily unavailable. The operational source remains Supabase, so failed syncs must be reviewed in logs and fixed by republishing or editing the affected entry.

## Video Rule

Strapi must not store private course videos directly.

For each lesson, the CMS stores only `videoStoragePath`, for example:

```text
demo/bachata-sensual-basico/01-base-postura-conexion.mp4
```

The actual video file remains in the private Supabase Storage bucket. Express signs access only after checking preview or purchase permissions.

## Required Environment Variables

Backend:

```env
CMS_SYNC_TOKEN=change_me_with_a_long_random_token
```

Strapi:

```env
CMS_SYNC_BACKEND_URL=http://backend:4000
CMS_SYNC_TOKEN=change_me_with_the_same_backend_token
CMS_SYNC_TIMEOUT_MS=5000
```

Docker Compose provides local development defaults. Production must override them with real secrets.

## First Local Setup

1. Apply Supabase migrations.
2. Start Docker Compose.
3. Open `http://localhost:1337/admin`.
4. Create the first Strapi administrator.
5. Create and publish a course.
6. Create lessons linked to that course and provide `videoStoragePath`.
7. Confirm the synced content appears in Supabase and on the web.

## Local Validation

With Supabase, backend and Strapi running, create or update a published course from the Strapi admin panel and confirm that it appears in Supabase and on the public course catalogue.

## Security Boundaries

Strapi must never receive:

- Supabase service role key.
- Stripe secret key.
- Stripe webhook secret.
- Student auth tokens.
- Payment data.

Strapi only knows the CMS sync token and the backend URL.
