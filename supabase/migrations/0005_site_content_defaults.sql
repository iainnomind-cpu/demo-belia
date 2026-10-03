-- ============================================================
-- BELIA PLATFORM — Site content now drives the home page
-- Migration: 0005_site_content_defaults.sql
-- Run once in Supabase → SQL Editor.
-- ============================================================

-- The seeded hero ("Belleza Profesional", link to the non-existent /catalogo)
-- was never shown. Now that the home page reads it, reset it to empty so the
-- current design copy is used until the admin edits it. Edited rows are kept.
UPDATE public.site_content
SET content_data = '{}'::jsonb, updated_at = NOW()
WHERE id = 'home_banner_main'
  AND content_data ->> 'title' = 'Belleza Profesional'
  AND COALESCE(content_data ->> 'image_url', '') = '';

INSERT INTO public.site_content (id, content_data) VALUES
  ('home_banner_main', '{}'),
  ('home_carousel', '{"slides": []}'),
  ('vip_threshold', '{"value": "3000"}')  -- read by Admin → Clientes (VIP badge)
ON CONFLICT (id) DO NOTHING;
