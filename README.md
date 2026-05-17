# Suarez y Carmen | Academia Online de Bachata

Proyecto Final de Grado (TFG) - 2o DAW

Plataforma full-stack de e-learning para Suarez y Carmen. El sistema cubre:
- web publica de marca
- academia online con compra singular por curso
- autenticacion de usuarios
- backend Express para logica de negocio
- pagos con Stripe via webhook server-to-server
- SEO tecnico basico con sitemap, robots y metadata Open Graph

## Stack

| Capa | Tecnologia | Puerto |
|---|---|---|
| Frontend | Next.js (App Router), React, Tailwind | 3000 |
| Backend | Node.js, Express, Helmet | 4000 |
| Base de datos | Supabase (PostgreSQL, Auth, RLS) | 54321/54322 local |
| CMS editorial | Strapi | 1337 |
| Pagos | Stripe (Checkout + Webhooks) | - |

## Estructura

```text
suarez-y-carmen/
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |-- components/
|   |   `-- lib/
|   |-- Dockerfile.dev
|   `-- .env.example
|-- backend/
|   |-- src/
|   |   |-- controllers/
|   |   |-- routes/
|   |   `-- index.js
|   |-- Dockerfile.dev
|   `-- .env.example
|-- cms/
|   |-- src/
|   |-- config/
|   |-- Dockerfile.dev
|   `-- .env.example
|-- supabase/
|   |-- migrations/
|   `-- config.toml
`-- docker-compose.yml
```

## Arranque local

Requisitos:
- Docker Desktop activo
- Supabase CLI disponible via `npx`
- Variables locales creadas desde los `.env.example`

1. Arrancar Supabase local desde la raiz del repo:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\supabase-start.ps1
```

2. Arrancar los servicios de aplicacion:

```bash
docker compose up -d --build
```

3. Cargar contenido local de demo (cursos, lecciones, eventos y videos privados de prueba):

```bash
cd backend
npm run seed:local-content
```

URLs:
- Frontend: http://localhost:3000
- Backend health: http://localhost:4000/api/health
- Strapi CMS: http://localhost:1337/admin
- Supabase Studio: http://localhost:54323
- Inbucket/Mailpit local: http://localhost:54324

Nota: no ejecutes comandos de Supabase con `--workdir supabase`; este proyecto usa `supabase/` como carpeta de configuracion dentro de la raiz del repo.

Parada:

```bash
docker compose down
npx supabase stop
```

## Variables de entorno

No se versionan claves reales. Crea:
- `frontend/.env.local` desde `frontend/.env.example`
- `backend/.env.local` desde `backend/.env.example`
- `cms/.env.local` desde `cms/.env.example` si se ejecuta Strapi fuera de Docker Compose
- `supabase/.env.local` desde `supabase/.env.example` (SMTP local)

## Politica SQL y email auth

- Migraciones versionadas: `supabase/migrations`
- SQL ad-hoc no versionado: `supabase/snippets`
- Email auth: Supabase Auth + SMTP (Resend)
- Templates: `supabase/templates/*.html` (fuente en `frontend/scripts/build-auth-email-templates.mjs`)
- Seed local: `backend/scripts/seed-local-content.mjs`
- CMS editorial: `cms` (Strapi), sincronizado con Supabase mediante `POST /api/cms/sync`

Mas detalle en `docs/email-and-sql-policy.md`.
Integracion CMS en `docs/cms-strapi-integration.md`.
Contrato de API en `docs/api-reference.md`.

## Endpoints backend

Endpoints publicos por diseno:
- `GET /api/health`: comprobacion basica de estado.
- `POST /api/stripe/webhook`: webhook de Stripe, protegido mediante firma.
- `POST /api/stripe/create-checkout-session`: requiere sesion de usuario.
- `GET /api/stripe/checkout-session-status`: requiere sesion de usuario y valida pertenencia de la sesion.
- `GET /api/lessons/:lessonId/video-url`: devuelve URLs firmadas solo para previews o usuarios con compra valida.
- `GET /api/lessons/playback/:token`: sirve video protegido desde backend sin exponer la URL privada de Storage.
- `GET /api/lessons/hls/:token/manifest`: sirve manifiestos HLS reescritos a rutas protegidas.
- `GET /api/lessons/hls/:token/resource`: sirve playlists hijas y segmentos HLS protegidos.
- `GET /api/video-devices`: lista dispositivos de video del usuario autenticado.
- `POST /api/video-devices/:deviceId/revoke`: revoca un dispositivo de video del usuario autenticado.
- `POST /api/cms/sync`: sincronizacion Strapi -> Express, protegida con `CMS_SYNC_TOKEN`.

`GET /api/supabase-test` solo existe si `ENABLE_SUPABASE_TEST_ENDPOINT=true`, pensado para diagnostico local.
Por defecto queda desactivado incluso en Docker Compose; activalo solo de forma temporal cuando necesites comprobar la conexion local con Supabase.

## Validacion local

Comandos recomendados antes de subir cambios:

```bash
cd frontend
npm run lint
npx tsc --noEmit --incremental false
```

```bash
cd backend
npm test
```

El repositorio tambien ejecuta en CI auditoria de dependencias, lint, type-check, build de frontend, build de plantillas de email, comprobacion sintactica de backend, build de CMS y comprobacion de patrones de secretos en archivos versionados.

## Notas de seguridad y produccion

- Los `.env.local` no se versionan.
- Los valores por defecto de `docker-compose.yml` son solo para desarrollo local.
- En produccion hay que sustituir `CMS_SYNC_TOKEN`, secretos de Strapi, credenciales de base de datos, claves de Stripe, Supabase service role y SMTP.
- `NODE_ENV=production` debe estar definido en el backend desplegado para desactivar endpoints de diagnostico.
- Configurar correctamente `FRONTEND_URL`, `CORS_ORIGINS`, `NEXT_PUBLIC_SITE_URL`, `BACKEND_URL`, `BACKEND_INTERNAL_URL` y `PUBLIC_URL` segun el dominio real.
- En produccion, no activar `ENABLE_SUPABASE_TEST_ENDPOINT` salvo diagnostico temporal controlado.
- El backend Express mantiene la logica sensible: checkout, webhooks, sincronizacion CMS y URLs firmadas de video.
- El frontend aplica cabeceras de seguridad basicas: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.
- Los videos privados se sirven mediante proxy temporal del backend; no se debe exponer directamente el bucket privado ni sus URLs firmadas al cliente final.
- Los accesos de video se auditan con hashes de IP y user-agent; no se guardan esos valores en claro.
- El acceso a video comprado limita dispositivos activos por usuario mediante identificadores en cookie HttpOnly y hashes almacenados en base de datos.
- Si una leccion apunta a un manifiesto `.m3u8`, el backend reescribe el HLS para que playlists y segmentos pasen por rutas protegidas.
