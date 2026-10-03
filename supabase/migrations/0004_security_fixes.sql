-- ============================================================
-- BELIA PLATFORM — Security & integrity fixes
-- Migration: 0004_security_fixes.sql
-- Run once in Supabase → SQL Editor.
-- ============================================================

-- ─── 1. Hide price_proveedor from the public API ────────────
-- RLS filters rows, not columns: before this, anyone could request
-- /rest/v1/products?select=price_proveedor with the public anon key.
REVOKE SELECT ON public.products FROM anon, authenticated;
GRANT SELECT (
  id, sku, name, description, category_id, brand,
  price_publico, price_promo, stock, image_url, featured_label,
  is_active, source, created_at, updated_at
) ON public.products TO anon, authenticated;

-- Admin panel listing (includes price_proveedor and inactive products)
CREATE OR REPLACE FUNCTION public.admin_get_products()
RETURNS SETOF public.products
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  RETURN QUERY SELECT * FROM public.products;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_products() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_products() TO authenticated;

-- ─── 2. Orders are created only by the confirm-order Edge Function ──
-- Before this, any logged-in user could insert an order with any total
-- and status 'Procesando' without paying.
DROP POLICY IF EXISTS "users_insert_own_orders" ON public.orders;
DROP POLICY IF EXISTS "users_insert_own_order_items" ON public.order_items;

-- One order per Stripe payment (makes confirm-order idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_payment_intent_key
  ON public.orders (stripe_payment_intent)
  WHERE stripe_payment_intent IS NOT NULL;

-- Atomic stock decrement used by confirm-order (service role only)
CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.products
  SET stock = GREATEST(stock - p_quantity, 0)
  WHERE id = p_product_id;
$$;

REVOKE ALL ON FUNCTION public.decrement_stock(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_stock(UUID, INTEGER) TO service_role;

-- ─── 3. Public supplier requests can only be created as 'pendiente' ──
DROP POLICY IF EXISTS "public_insert_supplier_request" ON public.suppliers;
CREATE POLICY "public_insert_supplier_request"
  ON public.suppliers FOR INSERT
  WITH CHECK (status = 'pendiente' AND user_id IS NULL AND admin_notes IS NULL);

-- ─── 4. One-time data fix: products synced while the Stock column was empty ──
-- The first syncs stored stock = 0 for every sheet product, so the whole
-- catalog showed as "Agotado". Sync now keeps the current stock when the cell
-- is empty and uses 100 for new products; this restores the existing ones.
UPDATE public.products SET stock = 100 WHERE source = 'sheet' AND stock = 0;
