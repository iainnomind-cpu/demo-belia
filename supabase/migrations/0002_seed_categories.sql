-- ============================================================
-- BELIA PLATFORM — Seed Categories
-- Migration: 0002_seed_categories.sql
-- ============================================================

DO $$
DECLARE
  capilar_id UUID;
  coloracion_id UUID;
  skincare_id UUID;
  maquillaje_id UUID;
  unas_id UUID;
  profesionales_id UUID;
  mens_care_id UUID;
BEGIN
  -- Capilar
  INSERT INTO public.categories (name, slug, sort_order) VALUES ('Capilar', 'capilar', 10)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO capilar_id;

  INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Shampoos y Tratamientos', 'capilar-shampoos-tratamientos', capilar_id, 10),
  ('Peinado y Estilizado', 'capilar-peinado-estilizado', capilar_id, 20),
  ('Accesorios', 'capilar-accesorios', capilar_id, 30)
  ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id;

  -- Coloración
  INSERT INTO public.categories (name, slug, sort_order) VALUES ('Coloración', 'coloracion', 20)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO coloracion_id;

  INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Tintes', 'coloracion-tintes', coloracion_id, 10),
  ('Decolorantes', 'coloracion-decolorantes', coloracion_id, 20),
  ('Peróxidos', 'coloracion-peroxidos', coloracion_id, 30),
  ('Accesorios', 'coloracion-accesorios', coloracion_id, 40),
  ('Otros', 'coloracion-otros', coloracion_id, 50)
  ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id;

  -- Skincare
  INSERT INTO public.categories (name, slug, sort_order) VALUES ('Skincare', 'skincare', 30)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO skincare_id;

  INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Depilación', 'skincare-depilacion', skincare_id, 10),
  ('Facial', 'skincare-facial', skincare_id, 20),
  ('Corporal', 'skincare-corporal', skincare_id, 30),
  ('Manos y Pies', 'skincare-manos-pies', skincare_id, 40),
  ('Accesorios', 'skincare-accesorios', skincare_id, 50)
  ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id;

  -- Maquillaje
  INSERT INTO public.categories (name, slug, sort_order) VALUES ('Maquillaje', 'maquillaje', 40)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO maquillaje_id;

  INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Rostro', 'maquillaje-rostro', maquillaje_id, 10),
  ('Labios', 'maquillaje-labios', maquillaje_id, 20),
  ('Ojos', 'maquillaje-ojos', maquillaje_id, 30),
  ('Accesorios', 'maquillaje-accesorios', maquillaje_id, 40)
  ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id;

  -- Uñas
  INSERT INTO public.categories (name, slug, sort_order) VALUES ('Uñas', 'unas', 50)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO unas_id;

  INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Esmaltes', 'unas-esmaltes', unas_id, 10),
  ('Decoración', 'unas-decoracion', unas_id, 20),
  ('Manicure', 'unas-manicure', unas_id, 30),
  ('Pedicure', 'unas-pedicure', unas_id, 40),
  ('Accesorios', 'unas-accesorios', unas_id, 50)
  ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id;

  -- Profesionales
  INSERT INTO public.categories (name, slug, sort_order) VALUES ('Profesionales', 'profesionales', 60)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO profesionales_id;

  INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Estilistas', 'profesionales-estilistas', profesionales_id, 10),
  ('Barbers', 'profesionales-barbers', profesionales_id, 20),
  ('Lashistas', 'profesionales-lashistas', profesionales_id, 30),
  ('Manicuristas', 'profesionales-manicuristas', profesionales_id, 40),
  ('Pedicuristas', 'profesionales-pedicuristas', profesionales_id, 50)
  ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id;

  -- Men's Care
  INSERT INTO public.categories (name, slug, sort_order) VALUES ('Men''s Care', 'mens-care', 70)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO mens_care_id;

  INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Peinado y Estilizado', 'mens-care-peinado-estilizado', mens_care_id, 10),
  ('Barba y Bigote', 'mens-care-barba-bigote', mens_care_id, 20),
  ('Skincare', 'mens-care-skincare', mens_care_id, 30),
  ('Shampoos y Tratamientos', 'mens-care-shampoos-tratamientos', mens_care_id, 40),
  ('Accesorios', 'mens-care-accesorios', mens_care_id, 50)
  ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id;

END $$;
