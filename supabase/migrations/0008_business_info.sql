-- ============================================================
-- BELIA PLATFORM — Business data block
-- Migration: 0008_business_info.sql
-- Run once in Supabase → SQL Editor.
--
-- Contact/legal data edited in Admin → Contenido → "Datos del negocio".
-- Used by the footer, legal pages, contact page, WhatsApp buttons and emails.
-- ============================================================

INSERT INTO public.site_content (id, content_data) VALUES
  ('business_info', '{"nombre_comercial": "Belia", "whatsapp": "523380007919"}')
ON CONFLICT (id) DO NOTHING;
