-- ============================================================
-- BELIA PLATFORM — Products in more than one category
-- Migration: 0007_extra_categories.sql
-- Run once in Supabase → SQL Editor.
--
-- A product keeps its main category (category_id) and can also appear in
-- extra ones, e.g. "CERA PASSINI" in Corporal / Depilación (main) and in
-- Profesionales / Waxers (extra). Filled by the sheet sync from the
-- "Categorías adicionales" column.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS extra_category_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS products_extra_category_ids_idx
  ON public.products USING GIN (extra_category_ids);

-- Column-level read access (0004 replaced table-wide SELECT with a column list)
GRANT SELECT (extra_category_ids) ON public.products TO anon, authenticated;
