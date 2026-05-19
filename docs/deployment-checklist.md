# Deployment Checklist

This checklist documents the production deployment work without including real credentials or customer-specific values.

## Scope

The project is split into these deployable parts:

- Frontend: Next.js application.
- Backend: Express API.
- Database/Auth/Storage: Supabase.
- CMS: Strapi.
- Payments: Stripe.
- Email: Supabase Auth SMTP through Resend.

## Pre-deployment Checks

Before deploying:

- Run frontend lint, type-check and build.
- Run backend syntax checks.
- Run CMS build.
- Build production backend and CMS container images with `backend/Dockerfile` and `cms/Dockerfile`.
- Apply Supabase migrations in a controlled environment.
- Verify local checkout and webhook flow in Stripe test mode.
- Verify private video access, private course resources, HLS rewriting and device revocation.
- Check that no `.env.local`, provider keys, service-role keys or local-only scripts are committed.

## Frontend

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=https://suarezycarmenbachata.com
NEXT_PUBLIC_BACKEND_URL=https://api.suarezycarmenbachata.com
BACKEND_INTERNAL_URL=
NEXT_PUBLIC_CMS_URL=https://cms.suarezycarmenbachata.com
```

Deployment notes:

- `NEXT_PUBLIC_SITE_URL` must match the final public domain.
- `NEXT_PUBLIC_BACKEND_URL` must point to the public backend URL.
- `BACKEND_INTERNAL_URL` can point to a private/internal backend URL when the hosting provider supports it.
- `NEXT_PUBLIC_CMS_URL` documents the public CMS asset origin used for uploaded images.
- The frontend exposes sitemap, robots, metadata and security headers.

## Backend

Required variables:

```env
NODE_ENV=production
PORT=
TRUST_PROXY=
FRONTEND_URL=https://suarezycarmenbachata.com
CORS_ORIGINS=https://suarezycarmenbachata.com
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_VIDEO_BUCKET=
SUPABASE_RESOURCE_BUCKET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
CMS_SYNC_TOKEN=
VIDEO_PLAYBACK_TOKEN_SECRET=
VIDEO_AUDIT_HASH_SECRET=
```

Deployment notes:

- `NODE_ENV=production` is required.
- `TRUST_PROXY` must match the hosting provider topology. Use `1` for a single trusted reverse proxy.
- `CORS_ORIGINS` must include only approved frontend origins.
- `ENABLE_SUPABASE_TEST_ENDPOINT` must stay disabled by default; production code ignores it even if it is accidentally set.
- `VIDEO_PLAYBACK_TOKEN_SECRET` and `VIDEO_AUDIT_HASH_SECRET` must be long random secrets.
- Backend logs can contain operational context, but public responses must stay generic.
- Production backend images use `backend/Dockerfile`; local hot-reload remains in `backend/Dockerfile.dev`.

## Supabase

Production setup:

- Apply migrations through Supabase CLI or a controlled migration workflow.
- Confirm RLS is enabled on user, purchase, progress, video audit and editorial tables.
- Keep Storage buckets for private video non-public.
- Keep Storage buckets for private downloadable resources non-public.
- Configure Auth redirect URLs for the final frontend domain.
- Configure SMTP settings for production email delivery.

## Stripe

Production setup:

- Create production products/prices only when final course content and pricing are approved.
- Configure webhook endpoint to point to the deployed backend.
- Store the webhook secret only in backend environment variables.
- Test the full checkout flow in test mode before switching to live keys.

## Resend / Email

Production setup:

- Verify `suarezycarmenbachata.com` or a dedicated sending subdomain.
- Configure SPF, DKIM and DMARC.
- Use a sender aligned with the brand domain, for example `academy@suarezycarmenbachata.com`.
- Keep Auth confirmation and recovery templates synchronized with Supabase.

## Strapi CMS

Required variables:

```env
NODE_ENV=production
PUBLIC_URL=
DATABASE_CLIENT=
DATABASE_HOST=
DATABASE_PORT=
DATABASE_NAME=
DATABASE_USERNAME=
DATABASE_PASSWORD=
DATABASE_SSL=
APP_KEYS=
API_TOKEN_SALT=
ADMIN_JWT_SECRET=
ADMIN_ENCRYPTION_KEY=
TRANSFER_TOKEN_SALT=
JWT_SECRET=
CMS_SYNC_BACKEND_URL=
CMS_SYNC_TOKEN=
```

Deployment notes:

- Strapi must not receive Supabase service-role keys, Stripe keys or student tokens.
- CMS uploads should use persistent storage in production.
- Publishing content in Strapi must sync through the Express backend.
- Production CMS images use `cms/Dockerfile`; local hot-reload remains in `cms/Dockerfile.dev`.

## Domain and HTTPS

Final domain tasks:

- Point `suarezycarmenbachata.com` to the frontend host.
- Point `api.suarezycarmenbachata.com` to the backend host.
- Point `cms.suarezycarmenbachata.com` to the CMS host if it is exposed.
- Enable HTTPS for every public host.
- Update Supabase Auth redirect URLs.
- Update Stripe webhook URL.
- Update Resend domain configuration if needed.

## Final Smoke Test

After deployment:

- Public home loads.
- Course catalogue loads.
- Login and logout work.
- Signup sends verification email.
- Verified user can log in.
- Unverified user cannot access private flows.
- Course checkout opens Stripe.
- Webhook grants course access.
- Purchased lesson plays through protected backend routes.
- Unpurchased lesson stays locked.
- CMS publish/edit/unpublish syncs with the public website.
- `/robots.txt` and `/sitemap.xml` return 200.
