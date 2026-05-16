# Frontend

Interfaz web de la plataforma Suárez y Carmen.

Este paquete contiene la capa de presentación desarrollada con Next.js, React y Tailwind CSS. Su responsabilidad es renderizar la web pública, el catálogo de cursos, el área de alumno, el login, la recuperación de contraseña y la integración visual con los flujos de compra y vídeo protegido.

## Responsabilidades

- Renderizar la home pública y las páginas informativas.
- Mostrar el catálogo de cursos publicados.
- Gestionar formularios de registro, inicio de sesión y recuperación de contraseña mediante Supabase Auth.
- Iniciar compras de cursos llamando al backend Express.
- Consultar el estado de checkout después de volver desde Stripe.
- Mostrar lecciones accesibles según preview o compra validada.
- Solicitar al backend URLs temporales de reproducción protegida.
- Mantener una experiencia responsive y accesible.

## Límites de la Capa

El frontend no calcula precios, no concede accesos, no verifica pagos y no firma URLs de vídeo. Estas operaciones se delegan en el backend Express para mantener separada la lógica sensible.

## Comandos Locales

```bash
npm run dev
npm run lint
npx tsc --noEmit --incremental false
npm run build
npm run build:auth-emails
```

## Variables de Entorno

Crear `frontend/.env.local` a partir de `frontend/.env.example`.

Variables principales:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_BACKEND_URL`
- `BACKEND_URL`
- `BACKEND_INTERNAL_URL`

No versionar `.env.local` ni claves reales.

## Validación Recomendada

Antes de integrar cambios del frontend:

```bash
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

Si se modifican plantillas de correo:

```bash
npm run build:auth-emails
```
