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
- `Course Resource`: course relation, title, description, order, preview flag, optional public URL for previews and `resourceStoragePath` for private course materials.
- `Event`: title, city, date, type, image and external links.
- `Home Content`: editable hero copy and CTAs.
- `FAQ`: editable public questions and answers.
- `In-person Class`: editable regular class information.

All of these published content types are synced into Supabase through the Express backend. Supabase remains the operational source consumed by the public website and by the learner area.

## Sync Model

Strapi sends editorial changes to the Express backend through `POST /api/cms/sync`.

The endpoint is protected with a shared `CMS_SYNC_TOKEN` and accepts only:

- `course`
- `lesson`
- `course_resource`
- `event`
- `home_content`
- `faq`
- `in_person_class`

Delete operations are handled as soft publication changes:

- Deleting or unpublishing a course sets `courses.is_published = false`.
- Deleting or unpublishing a lesson sets `lessons.is_published = false`.
- Deleting or unpublishing a course resource sets `course_resources.is_published = false`.
- Deleting or unpublishing an event sets `events.is_active = false`.
- Deleting or unpublishing home content sets `home_content.is_published = false`.
- Deleting or unpublishing a FAQ sets `faqs.is_published = false`.
- Deleting or unpublishing an in-person class sets `in_person_classes.is_active = false`.

This avoids destroying user purchases, progress records or public editorial history.

Published updates are also synced. If Strapi saves a draft without a published document, the middleware skips the sync because the public website must only consume published content.

The Strapi middleware logs backend sync errors without rolling back the editor action. This avoids blocking non-technical users when the backend is temporarily unavailable. The operational source remains Supabase, so failed syncs must be reviewed in logs and fixed by republishing or editing the affected entry.

## Video Rule

Strapi must not store private course videos directly.

For each lesson, the CMS stores only `videoStoragePath`, for example:

```text
bachazouk-vol-1/01-bienvenida.mp4
```

The actual video file remains in the private Supabase Storage bucket. Express signs access only after checking preview or purchase permissions.

## Course Resource Rule

Course resources that belong to paid content must not use public Strapi upload URLs. Paid resources must store only `resourceStoragePath`, for example:

```text
bachazouk-vol-1/guia-bachazouk.pdf
```

The actual file must be uploaded to the private Supabase Storage bucket `course-resources`. Express returns a short-lived platform path and serves the file through the backend in inline mode only after checking that the resource is a free preview or that the user owns the course.

Public external URLs or Strapi files are acceptable only for free preview resources that are intentionally shareable.

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
7. Optionally create course resources linked to that course and provide `resourceStoragePath` for paid materials.
8. Optionally create public-page content: home content, FAQ entries and in-person classes.
9. Confirm the synced content appears in Supabase and on the web.

## Local Validation

With Supabase, backend and Strapi running, create or update a published course from the Strapi admin panel and confirm that it appears in Supabase and on the public course list.

For public editorial content, update the home content, FAQ entries or in-person classes and confirm that the frontend keeps rendering with the synced Supabase values. If Supabase tables are unavailable in a local reset, the frontend must degrade to safe fallback content instead of returning a blank page.

## Security Boundaries

Strapi must never receive:

- Supabase service role key.
- Stripe secret key.
- Stripe webhook secret.
- Student auth tokens.
- Payment data.

Strapi only knows the CMS sync token and the backend URL.
