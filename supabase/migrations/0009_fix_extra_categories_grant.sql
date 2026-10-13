-- ============================================================
-- BELIA PLATFORM — Restore read access to products.extra_category_ids
-- Migration: 0009_fix_extra_categories_grant.sql
-- Run once in Supabase → SQL Editor. Safe to run more than once.
--
-- WHY: 0004 revokes table-wide SELECT on products and re-grants a column list.
-- If 0004 runs after 0007, that also removes the grant on extra_category_ids,
-- and every category page fails with "permission denied for table products"
-- (401/403 in the browser console).
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS extra_category_ids UUID[] NOT NULL DEFAULT '{}';

GRANT SELECT (
  id, sku, name, description, category_id, extra_category_ids, brand,
  price_publico, price_promo, stock, image_url, featured_label,
  is_active, source, created_at, updated_at
) ON public.products TO anon, authenticated;

-- Re-running 0004 also restored an old admin_get_products() that read the role
-- from user_metadata ("Access denied: admin role required" in Admin → Productos).
CREATE OR REPLACE FUNCTION public.admin_get_products()
RETURNS SETOF public.products
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  RETURN QUERY SELECT * FROM public.products;
END;
$$;
