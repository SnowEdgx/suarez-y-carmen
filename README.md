# Suarez y Carmen | Academia Online de Bachata

Proyecto Final de Grado (TFG) - 2o DAW

Plataforma full-stack de e-learning para Suarez y Carmen. El sistema cubre:
- web publica de marca
- academia online con compra singular por curso
- autenticacion de usuarios
- backend Express para logica de negocio
- pagos con Stripe via webhook server-to-server

## Stack

| Capa | Tecnologia | Puerto |
|---|---|---|
| Frontend | Next.js (App Router), React, Tailwind | 3000 |
| Backend | Node.js, Express, Helmet | 4000 |
| Base de datos | Supabase (PostgreSQL, Auth, RLS) | 54321/54322 local |
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

2. Arrancar frontend y backend:

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
- `supabase/.env.local` desde `supabase/.env.example` (SMTP local)

## Politica SQL y email auth

- Migraciones versionadas: `supabase/migrations`
- SQL ad-hoc no versionado: `supabase/snippets`
- Email auth: Supabase Auth + SMTP (Resend)
- Templates: `supabase/templates/*.html` (fuente en `frontend/scripts/build-auth-email-templates.mjs`)
- Seed local: `backend/scripts/seed-local-content.mjs`

Mas detalle en `docs/email-and-sql-policy.md`.
