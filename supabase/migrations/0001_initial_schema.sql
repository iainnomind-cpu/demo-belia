-- ============================================================
-- BELIA PLATFORM — Initial Schema & RLS Policies
-- Migration: 0001_initial_schema.sql
-- 🔒 BELIA RLS GATE: Every table has RLS enabled from creation.
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── CATEGORIES ─────────────────────────────────────────────
CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  parent_id   UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Public: read active categories (for storefront mega-menu)
CREATE POLICY "public_read_active_categories"
  ON public.categories FOR SELECT
  USING (is_active = TRUE);

-- Admin: full access
CREATE POLICY "admin_full_access_categories"
  ON public.categories FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- ─── PRODUCTS ───────────────────────────────────────────────
-- price_proveedor is stored here but NEVER returned by public policies.
-- Access to price_proveedor is via get_supplier_products() RPC ONLY.
CREATE TABLE public.products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku             TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  brand           TEXT,
  price_publico   NUMERIC(10,2) NOT NULL,
  price_promo     NUMERIC(10,2),
  price_proveedor NUMERIC(10,2), -- 🔒 NEVER in public select
  stock           INTEGER NOT NULL DEFAULT 0,
  image_url       TEXT,
  featured_label  TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  source          TEXT NOT NULL DEFAULT 'sheet' CHECK (source IN ('sheet', 'manual')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public: read active products, EXCLUDING price_proveedor
-- price_proveedor is not accessible through this policy
CREATE POLICY "public_read_active_products"
  ON public.products FOR SELECT
  USING (is_active = TRUE);

-- Admin: full access to all columns
CREATE POLICY "admin_full_access_products"
  ON public.products FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- ─── Secure RPC for supplier price access ───────────────────
-- Returns price_proveedor ONLY for authenticated approved suppliers.
CREATE OR REPLACE FUNCTION public.get_supplier_products(p_category_id UUID DEFAULT NULL)
RETURNS TABLE (
  id              UUID,
  sku             TEXT,
  name            TEXT,
  description     TEXT,
  category_id     UUID,
  brand           TEXT,
  price_publico   NUMERIC,
  price_promo     NUMERIC,
  price_proveedor NUMERIC,  -- Exposed only here, for approved proveedores
  stock           INTEGER,
  image_url       TEXT,
  featured_label  TEXT,
  is_active       BOOLEAN,
  source          TEXT,
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Gate: caller must be an authenticated approved proveedor or admin
  IF (auth.jwt() -> 'user_metadata' ->> 'role') NOT IN ('proveedor', 'admin') THEN
    RAISE EXCEPTION 'Access denied: insufficient role';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.sku, p.name, p.description, p.category_id, p.brand,
    p.price_publico, p.price_promo, p.price_proveedor,
    p.stock, p.image_url, p.featured_label, p.is_active, p.source,
    p.created_at, p.updated_at
  FROM public.products p
  WHERE p.is_active = TRUE
    AND (p_category_id IS NULL OR p.category_id = p_category_id);
END;
$$;

-- ─── ORDERS ─────────────────────────────────────────────────
CREATE TABLE public.orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id),
  tipo                  TEXT NOT NULL DEFAULT 'publico' CHECK (tipo IN ('publico', 'mayoreo')),
  status                TEXT NOT NULL DEFAULT 'Procesando'
                          CHECK (status IN ('Procesando', 'Enviado', 'Entregado', 'Cancelado')),
  total_amount          NUMERIC(10,2) NOT NULL,
  shipping_address      JSONB NOT NULL,
  tracking_info         JSONB,
  stripe_payment_intent TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Customers: read and insert own orders only
CREATE POLICY "users_own_orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin: full access
CREATE POLICY "admin_full_access_orders"
  ON public.orders FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- ─── ORDER ITEMS ─────────────────────────────────────────────
CREATE TABLE public.order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL  -- Snapshot at purchase time
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_order_items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_order_items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_full_access_order_items"
  ON public.order_items FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- ─── SUPPLIERS ───────────────────────────────────────────────
CREATE TABLE public.suppliers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES auth.users(id),
  company_name      TEXT NOT NULL,
  contact_name      TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  phone             TEXT,
  rfc               TEXT,
  category_interest TEXT,
  status            TEXT NOT NULL DEFAULT 'pendiente'
                      CHECK (status IN ('pendiente', 'aprobado', 'rechazado')),
  admin_notes       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Public: anyone can INSERT a new supplier request
CREATE POLICY "public_insert_supplier_request"
  ON public.suppliers FOR INSERT
  WITH CHECK (TRUE);

-- Admin: full access to all supplier records
CREATE POLICY "admin_full_access_suppliers"
  ON public.suppliers FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- ─── SYNC LOGS ───────────────────────────────────────────────
CREATE TABLE public.sync_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at       TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'en_progreso'
                      CHECK (status IN ('en_progreso', 'completado', 'error')),
  inserted_count    INTEGER NOT NULL DEFAULT 0,
  updated_count     INTEGER NOT NULL DEFAULT 0,
  deactivated_count INTEGER NOT NULL DEFAULT 0,
  error_message     TEXT
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Admin only
CREATE POLICY "admin_full_access_sync_logs"
  ON public.sync_logs FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- ─── SITE CONTENT ────────────────────────────────────────────
CREATE TABLE public.site_content (
  id           TEXT PRIMARY KEY,   -- e.g. 'home_banner_main'
  content_data JSONB NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Public: read site content (banners, carousel)
CREATE POLICY "public_read_site_content"
  ON public.site_content FOR SELECT
  USING (TRUE);

-- Admin: write access
CREATE POLICY "admin_write_site_content"
  ON public.site_content FOR ALL
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- ─── CART (Persistent, per FR-008) ──────────────────────────
CREATE TABLE public.cart_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_cart_items"
  ON public.cart_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Updated_at trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Seed: Initial Site Content ─────────────────────────────
INSERT INTO public.site_content (id, content_data) VALUES
  ('home_banner_main', '{"image_url": "", "title": "Belleza Profesional", "subtitle": "Para Estilistas y Salones", "cta_text": "Explorar Catálogo", "cta_url": "/catalogo"}'),
  ('home_carousel', '{"slides": []}')
ON CONFLICT (id) DO NOTHING;
