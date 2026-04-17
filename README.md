# Suárez y Carmen | Academia Online de Bachata

**Proyecto Final de Grado (TFG) · 2.º DAW**

Plataforma integral de e-learning diseñada para el dúo internacional de bailarines *Suárez y Carmen*. El sistema permite a los alumnos acceder a un catálogo avanzado de cursos de baile, gestionar sesiones seguras, realizar pagos únicos por contenido (tokenización) y disfrutar del material audiovisual desde cualquier dispositivo.

| Capa              | Tecnología Core                        | Puerto Local |
|-------------------|----------------------------------------|--------------|
| **Frontend**      | Next.js (App Router) · React · Tailwind| `3000`       |
| **Backend API**   | Node.js · Express.js · Helmet          | `4000`       |
| **Base de Datos** | Supabase (PostgreSQL + RLS + Auth API) | —            |
| **Pasarela**      | Stripe Webhooks (Servidor a Servidor)  | —            |

---

## 🏗️ Arquitectura del Proyecto

```text
suarez-y-carmen/
│
├── frontend/                        # Aplicación cliente SSR/SSG (Next.js)
│   ├── src/
│   │   ├── app/                     # App Router protegido (Rutas y Layouts)
│   │   ├── components/              # Interfaz y Componentes Reutilizables
│   │   └── lib/                     # Clientes de Supabase (@supabase/ssr)
│   ├── Dockerfile.dev
│   └── .env.example                 # Plantilla de variables de entorno
│
├── backend/                         # API REST y Gestión Segura (Express)
│   ├── src/
│   │   ├── index.js                 # Punto de entrada (Configurado con Helmet y CORS)
│   │   ├── controllers/             # Validadores y lógica de Checkout
│   │   └── routes/                  # Endpoints protegidos
│   ├── Dockerfile.dev
│   └── .env.example                 # Plantilla de claves privadas
│
└── docker-compose.yml               # Orquestación de Integración Continua Local
```

### Fundamentos Técnicos (Defensa Técnica)

1. **Gestión de Identidad y Roles (BaaS)**
   - Autenticación controlada mediante **Supabase Auth SSR**, que asegura el flujo de cookies seguras directamente en el servidor.
   - Mitigación de **User Enumeration Attacks**: Mensajes de error sanitizados frente al cliente final, reservando el volcado técnico para los logs privados de Docker.
   - Seguridad de Capa de Datos vía **Row Level Security (RLS)** en PostgreSQL, asegurando estrictamente el acceso a la información personal según el `auth.uid()` del portador del token.

2. **Flujo de Transacciones**
   - Redirección certificada para la pasarela de compra. Las tarjetas nunca entran en contacto con el FrontEnd.
   - Confirmación transaccional asíncrona mediante un **Webhook Seguro de Stripe**. Express aísla el parser global `express.json()` en esta ruta para verificar la firma de seguridad generada (raw body hash) garantizando autenticidad estricta entre servidores.

3. **Ciberseguridad y Cabeceras**
   - El ecosistema Node.js expone su API bajo el escudo **Helmet.js**, bloqueando ataques preventivos vía HTTP (ej: Clickjacking, XSS, Sniffing), ocultando huellas tecnológicas (`x-powered-by`), e imponiendo una sólida política de seguridad de contenido.

4. **Entorno Dockerizado Uniforme**
   - Contenedorización multientorno a cargo de un orquestador único (`docker-compose.yml`) que simplifica la validación técnica en las máquinas de evaluación y facilita un despliegue transparente a producción.

---

## 🚀 Despliegue de Evaluación

### Prerrequisitos
- Disponer del motor [Docker Desktop](https://www.docker.com/products/docker-desktop/) activo. No es necesario contar con un motor de Node nativo.

### Puesta en Marcha
1. Descarga el repositorio y abre tu terminal en la raíz.
2. Inicia los servicios de forma orquestada:

```bash
docker compose up --build
```
*Este comando genera las imágenes, monta los volúmenes en caché interno y habilita el puerto local. Observarás los logs del Frontend y Backend en la consola actual.*

### Ubicaciones
- **Academia Virtual:** `http://localhost:3000`
- **Comprobación de Salud del Servidor API:** `http://localhost:4000/api/health`

### Apagado Limpio
```bash
docker compose down
```

### Configuración de Seguridad (`.env.local`)
Las credenciales maestras (Supabase y Stripe) han sido excluidas intencionalmente vía `.gitignore` para prevenir vulnerabilidades en el repositorio. Para evaluar con acceso completo a las bases de datos de Postgres y pasarelas de test, debes:
1. Navegar a las carpetas `/frontend/` y `/backend/`.
2. Duplicar sus respectivos ficheros `.env.example`.
3. Renombrar las nuevas copias a `.env.local` e inyectar las claves proporcionadas en el apéndice de la memoria.

## Seguridad SQL y Email Auth
- Las migraciones versionadas viven en `supabase/migrations`.
- Las consultas ad-hoc de Studio se ignoran en `supabase/snippets`.
- El flujo de emails de autenticacion se configura con Supabase + SMTP (Resend) y plantillas HTML generadas desde React.
- Detalles de setup: `docs/email-and-sql-policy.md`.
