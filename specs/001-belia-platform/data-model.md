# Data Model & API Contracts

## Entidades Principales (Supabase Postgres)

### `categories`
- `id` (uuid, pk)
- `name` (text, no nulo)
- `slug` (text, único, no nulo)
- `parent_id` (uuid, fk a categories, nullable para categorías raíz)
- `is_active` (boolean, default true)
- `sort_order` (integer, default 0)

### `products`
- `id` (uuid, pk)
- `sku` (text, único, no nulo)
- `name` (text, no nulo)
- `description` (text)
- `category_id` (uuid, fk a categories)
- `brand` (text)
- `price_publico` (numeric, no nulo)
- `price_promo` (numeric, nullable)
- `price_proveedor` (numeric, nullable) **[SECURE: RLS Protegido]**
- `stock` (integer, default 0)
- `image_url` (text)
- `featured_label` (text, nullable, ej: "TOP 1")
- `is_active` (boolean, default true)
- `source` (text, enum: 'sheet', 'manual', default 'sheet')
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `suppliers` (Solicitudes de Proveedores)
- `id` (uuid, pk)
- `user_id` (uuid, fk a auth.users, nullable hasta ser aprobado)
- `company_name` (text, no nulo)
- `contact_name` (text, no nulo)
- `email` (text, único, no nulo)
- `phone` (text)
- `rfc` (text)
- `category_interest` (text)
- `status` (text, enum: 'pendiente', 'aprobado', 'rechazado', default 'pendiente')
- `admin_notes` (text, nullable)
- `created_at` (timestamptz)

### `orders`
- `id` (uuid, pk)
- `user_id` (uuid, fk a auth.users, no nulo)
- `tipo` (text, enum: 'publico', 'mayoreo', default 'publico')
- `status` (text, enum: 'Procesando', 'Enviado', 'Entregado', 'Cancelado', default 'Procesando')
- `total_amount` (numeric, no nulo)
- `shipping_address` (jsonb, no nulo)
- `tracking_info` (jsonb, nullable)
- `stripe_payment_intent` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `order_items`
- `id` (uuid, pk)
- `order_id` (uuid, fk a orders, no nulo)
- `product_id` (uuid, fk a products, no nulo)
- `quantity` (integer, no nulo)
- `unit_price` (numeric, no nulo) -- Snapshot del precio al momento de la compra

### `sync_logs`
- `id` (uuid, pk)
- `started_at` (timestamptz, default now())
- `finished_at` (timestamptz, nullable)
- `status` (text, enum: 'en_progreso', 'completado', 'error')
- `inserted_count` (integer, default 0)
- `updated_count` (integer, default 0)
- `deactivated_count` (integer, default 0)
- `error_message` (text, nullable)

### `site_content`
- `id` (text, pk) -- ej: 'home_banner_main', 'home_carousel'
- `content_data` (jsonb, no nulo) -- Contenido dinámico (URLs de imagen, textos)
- `updated_at` (timestamptz)

---

## Row Level Security (RLS) & Reglas de Acceso

- **`products`**:
  - Lectura pública: `is_active = true`. El campo `price_proveedor` NO se expone al cliente (restringido vía política de columna u omitido en consultas directas).
  - RPC seguras: `get_supplier_products()` devuelve el precio de proveedor SOLO si `auth.role() = 'proveedor'`.
- **`orders` / `order_items`**:
  - Lectura/Escritura: Los clientes solo pueden ver/crear sus propios pedidos (`user_id = auth.uid()`).
- **`suppliers`**:
  - Escritura pública (Insert): Permitido para crear nuevas solicitudes.
  - Lectura: Solo `admin`.
- **Panel de Admin**: Todos los accesos de escritura a productos, categorías, logs y contenido están restringidos a `auth.role() = 'admin'`.

## Contratos de API (Edge Functions)

### 1. Sincronización de Catálogo (`/sync-catalog`)
- **Method**: POST
- **Auth**: Requerido (Admin)
- **Acción**: Lee de Google Sheets API v4, compara con `products`, aplica diff, actualiza `sync_logs`.

### 2. Creación de Intento de Pago (`/create-payment-intent`)
- **Method**: POST
- **Auth**: Requerido
- **Body**: `{ items: [{ product_id, quantity }] }`
- **Acción**: Valida stock y precios en DB, calcula total con envío (envía.com), llama a Stripe API, devuelve `clientSecret`.

### 3. Aprobación de Proveedor (`/approve-supplier`)
- **Method**: POST
- **Auth**: Requerido (Admin)
- **Body**: `{ supplier_id: uuid }`
- **Acción**: Asigna rol `proveedor` en Supabase Auth, actualiza status a `aprobado`, envía email vía SMTP Gmail.
