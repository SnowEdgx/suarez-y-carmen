# Email Auth + SQL Policy

## SQL policy (safe by default)

- **Versioned**: `supabase/migrations/*.sql`
- **Not versioned**: `supabase/snippets/*.sql` (queries ad-hoc / exploración)

Regla: cualquier cambio de esquema o permisos va siempre como migración formal.

## Transactional auth email stack

- Proveedor: **Supabase Auth + SMTP de Resend**
- Local: SMTP custom con Resend si se arranca Supabase cargando `supabase/.env.local`
- Producción: Resend se configura en Supabase Cloud como SMTP custom antes de abrir registros reales
- Inbucket/Mailpit queda como visor de desarrollo si se desactiva temporalmente el SMTP custom
- Plantillas versionadas en `supabase/templates/*.html`
- Fuente de plantillas: componentes React renderizados a HTML mediante `frontend/scripts/build-auth-email-templates.mjs`

## Variables necesarias

Definir en el entorno de Supabase (local o cloud):

- `SUPABASE_AUTH_SMTP_PASS`: SMTP password de Resend
- `SUPABASE_AUTH_SMTP_FROM`: remitente verificado (ej. `academy@mail.suarezycarmenbachata.com`)
- Plantilla local: `supabase/.env.example`
- Archivo local recomendado (no versionado): `supabase/.env.local`

## Arranque local correcto

Ejecutar comandos de Supabase desde la **raíz del repositorio** (donde existe la carpeta `supabase/`), por ejemplo:

```bash
npx supabase start
```

No usar `--workdir supabase`, porque puede crear un workspace anidado `supabase/supabase` con configuración por defecto.

Para evitar exportar variables manualmente en cada sesión:

1. Copiar `supabase/.env.example` a `supabase/.env.local`.
2. Completar valores reales de SMTP.
3. Iniciar con:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\supabase-start.ps1
```

Opcional (reinicio limpio):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\supabase-start.ps1 -Restart
```

## Dominio y entregabilidad (Resend)

1. Verificar dominio/subdominio dedicado de envío. Para este proyecto se usa `mail.suarezycarmenbachata.com`.
2. Configurar registros DNS recomendados por Resend:
   - SPF
   - DKIM
   - DMARC
3. Usar un remitente alineado con el dominio verificado (`academy@mail.suarezycarmenbachata.com`) para mejorar confianza y entregabilidad.
4. Si Resend devuelve `550 domain is not verified`, completar primero la verificación DNS antes de pruebas E2E de signup.

El correo público de soporte puede mantenerse como `academy@suarezycarmenbachata.com` si existe como buzón o redirección en el proveedor del dominio. El remitente SMTP de Supabase debe pertenecer al dominio verificado en Resend.

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
