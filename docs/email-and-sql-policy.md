# Email Auth + SQL Policy

## SQL policy (safe by default)

- **Versioned**: `supabase/migrations/*.sql`
- **Not versioned**: `supabase/snippets/*.sql` (queries ad-hoc / exploración)

Regla: cualquier cambio de esquema o permisos va siempre como migración formal.

## Transactional auth email stack

- Proveedor: **Supabase Auth + SMTP de Resend**
- Producción: SMTP custom configurado en Supabase Cloud (dashboard)
- Local: `supabase/config.toml` mantiene SMTP habilitado (`auth.email.smtp.enabled=true`) para reproducir el flujo real de confirmación
- Plantillas versionadas en `supabase/templates/*.html`
- Fuente de plantillas: componentes React renderizados a HTML mediante `frontend/scripts/build-auth-email-templates.mjs`

## Variables necesarias

Definir en el entorno de Supabase (local o cloud):

- `SUPABASE_AUTH_SMTP_PASS`: SMTP password de Resend
- `SUPABASE_AUTH_SMTP_FROM`: remitente verificado (ej. `academy@mail.tudominio.com`)

## Arranque local correcto

Ejecutar comandos de Supabase desde la **raíz del repositorio** (donde existe la carpeta `supabase/`), por ejemplo:

```bash
npx supabase start
```

No usar `--workdir supabase`, porque puede crear un workspace anidado `supabase/supabase` con configuración por defecto.

## Dominio y entregabilidad (Resend)

1. Verificar dominio/subdominio dedicado de envío (recomendado: `mail.tudominio.com`).
2. Configurar registros DNS recomendados por Resend:
   - SPF
   - DKIM
   - DMARC
3. Usar remitente real (`academy@...`) para mejorar confianza y entregabilidad.
4. Si Resend devuelve `550 domain is not verified`, completar primero la verificación DNS antes de pruebas E2E de signup.

## Flujo de plantillas

Desde `frontend/`:

```bash
npm run build:auth-emails
```

Esto genera:

- `supabase/templates/confirm-signup.html`
- `supabase/templates/recover-password.html`

## Nota sobre enlaces de confirmación

No aplicar sistemas de tracking que reescriban los links de confirmación/recuperación. El enlace de Supabase debe llegar intacto para evitar fallos de validación.
