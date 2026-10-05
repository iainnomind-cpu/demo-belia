-- ============================================================
-- BELIA PLATFORM — Move user roles to app_metadata
-- Migration: 0006_roles_app_metadata.sql
-- Run once in Supabase → SQL Editor.
--
-- WHY: roles lived in user_metadata, which ANY logged-in user can change from
-- the browser (supabase.auth.updateUser({ data: { role: 'admin' } })), so anyone
-- could make themselves admin. app_metadata can only be changed with the
-- service role (SQL Editor, Edge Functions), never by the user.
-- ============================================================

-- ─── 1. Copy existing roles into app_metadata, then remove them from user_metadata ──
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
                        || jsonb_build_object('role', raw_user_meta_data ->> 'role')
WHERE raw_user_meta_data ? 'role'
  AND raw_user_meta_data ->> 'role' IN ('admin', 'proveedor', 'cliente');

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE raw_user_meta_data ? 'role';

-- ─── 2. Single helper used by every policy ───────────────────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$;

-- ─── 3. Recreate admin policies on app_metadata ──────────────
DROP POLICY IF EXISTS "admin_full_access_categories" ON public.categories;
CREATE POLICY "admin_full_access_categories" ON public.categories FOR ALL
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "admin_full_access_products" ON public.products;
CREATE POLICY "admin_full_access_products" ON public.products FOR ALL
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "admin_full_access_orders" ON public.orders;
CREATE POLICY "admin_full_access_orders" ON public.orders FOR ALL
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "admin_full_access_order_items" ON public.order_items;
CREATE POLICY "admin_full_access_order_items" ON public.order_items FOR ALL
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "admin_full_access_suppliers" ON public.suppliers;
CREATE POLICY "admin_full_access_suppliers" ON public.suppliers FOR ALL
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "admin_full_access_sync_logs" ON public.sync_logs;
CREATE POLICY "admin_full_access_sync_logs" ON public.sync_logs FOR ALL
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "admin_write_site_content" ON public.site_content;
CREATE POLICY "admin_write_site_content" ON public.site_content FOR ALL
  USING (public.current_user_role() = 'admin') WITH CHECK (public.current_user_role() = 'admin');

-- ─── 4. RPCs that check the role ─────────────────────────────
CREATE OR REPLACE FUNCTION public.get_supplier_products(p_category_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID, sku TEXT, name TEXT, description TEXT, category_id UUID, brand TEXT,
  price_publico NUMERIC, price_promo NUMERIC, price_proveedor NUMERIC,
  stock INTEGER, image_url TEXT, featured_label TEXT, is_active BOOLEAN, source TEXT,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'proveedor'
     AND public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access denied: insufficient role';
  END IF;

  RETURN QUERY
  SELECT p.id, p.sku, p.name, p.description, p.category_id, p.brand,
         p.price_publico, p.price_promo, p.price_proveedor,
         p.stock, p.image_url, p.featured_label, p.is_active, p.source,
         p.created_at, p.updated_at
  FROM public.products p
  WHERE p.is_active = TRUE
    AND (p_category_id IS NULL OR p.category_id = p_category_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_products()
RETURNS SETOF public.products
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  RETURN QUERY SELECT * FROM public.products;
END;
$$;

-- ─── 5. Review: who has which role after the migration ───────
-- If someone in this list should NOT be admin, fix it with:
--   UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role":"cliente"}' WHERE email = 'correo@ejemplo.com';
SELECT email, raw_app_meta_data ->> 'role' AS role
FROM auth.users
WHERE raw_app_meta_data ->> 'role' IN ('admin', 'proveedor')
ORDER BY role, email;
