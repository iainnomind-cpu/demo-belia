# Quickstart: Belia Platform

## Requisitos Previos

- Node.js 20+
- Gestor de paquetes: `npm` o `yarn` o `pnpm`
- CLI de Supabase instalado (`npm i -g supabase`)
- Docker (requerido para correr Supabase de forma local)

## Configuración Local

1. **Clonar e instalar dependencias:**
   ```bash
   git clone <repo_url>
   cd stitch_belia_premium_beauty_storefront/belia-app
   npm install
   ```

2. **Inicializar Supabase Local:**
   ```bash
   supabase start
   ```
   Esto levantará los contenedores de Postgres, Auth, Storage, Edge Functions y el Studio local.

3. **Aplicar Migraciones:**
   ```bash
   supabase db reset
   ```
   Esto ejecutará todas las migraciones SQL (creación de tablas y políticas RLS) y aplicará los datos semilla iniciales.

4. **Variables de Entorno (Frontend):**
   Crea un archivo `.env.local` en la raíz del frontend (`belia-app`):
   ```env
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<obtener_del_output_de_supabase_start>
   ```

5. **Variables de Entorno (Backend / Edge Functions):**
   Crea un archivo `.env` en `supabase/functions/` (o configúralas en tu proyecto Supabase):
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   ENVIA_COM_API_KEY=...
   GMAIL_SMTP_USER=ia.innomind@gmail.com
   GMAIL_SMTP_PASS=<app_password>
   GOOGLE_SHEETS_API_KEY=...
   GOOGLE_SHEET_ID=...
   ```

6. **Iniciar Frontend:**
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:5173`.

## Roles de Usuario para Pruebas Locales

Puedes crear usuarios desde el Supabase Studio local (`http://127.0.0.1:54323`):
- **Admin**: `admin@belia.com` -> Cambiar rol o metadata `role: 'admin'`
- **Proveedor**: `proveedor@ejemplo.com` -> Cambiar rol o metadata `role: 'proveedor'`
- **Cliente**: `cliente@ejemplo.com` -> Rol por defecto
