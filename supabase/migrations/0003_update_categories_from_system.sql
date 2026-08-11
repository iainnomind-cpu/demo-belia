-- ============================================================
-- BELIA PLATFORM — Update Categories from System
-- Migration: 0003_update_categories_from_system.sql
-- ============================================================

DO $$
DECLARE
  capilar_id UUID;
  corporal_id UUID;
  facial_id UUID;
  manos_pies_id UUID;
  equipo_id UUID;
  profesionales_id UUID;
  mens_care_id UUID;
BEGIN
  -- 1. Eliminar las categorías existentes.
  -- Los productos tienen ON DELETE SET NULL, por lo que no se perderán.
  DELETE FROM public.categories;

  -- 2. Insertar las nuevas categorías principales y subcategorías

  -- ==========================================
  -- 1. Capilar
  -- ==========================================
  INSERT INTO public.categories (name, slug, sort_order) VALUES ('Capilar', 'capilar', 10)
  RETURNING id INTO capilar_id;

  INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Coloración', 'capilar-coloracion', capilar_id, 10),
  ('Shampoos y Acondicionadores', 'capilar-shampoos-acondicionadores', capilar_id, 20),
  ('Tratamientos', 'capilar-tratamientos', capilar_id, 30),
  ('Peinado y Estilizado', 'capilar-peinado-estilizado', capilar_id, 40),
  ('Aceites, Sílicas y Sedas', 'capilar-aceites-silicas-sedas', capilar_id, 50);

  -- ==========================================
  -- 2. Corporal
  -- ==========================================
  INSERT INTO public.categories (name, slug, sort_order) VALUES ('Corporal', 'corporal', 20)
  RETURNING id INTO corporal_id;

  INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Depilación', 'corporal-depilacion', corporal_id, 10),
  ('Skincare', 'corporal-skincare', corporal_id, 20);

  -- ==========================================
  -- 3. Facial
  -- ==========================================
  INSERT INTO public.categories (name, slug, sort_order) VALUES ('Facial', 'facial', 30)
  RETURNING id INTO facial_id;

  INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Cosméticos', 'facial-cosmeticos', facial_id, 10),
  ('Skincare', 'facial-skincare', facial_id, 20);

  -- ==========================================
  -- 4. Manos y Pies
  -- ==========================================
  INSERT INTO public.categories (name, slug, sort_order) VALUES ('Manos y Pies', 'manos-pies', 40)
  RETURNING id INTO manos_pies_id;

  INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Skincare', 'manos-pies-skincare', manos_pies_id, 10),
  ('Decoración', 'manos-pies-decoracion', manos_pies_id, 20);

  -- ==========================================
  -- 5. Equipo
  -- ==========================================
  INSERT INTO public.categories (name, slug, sort_order) VALUES ('Equipo', 'equipo', 50)
  RETURNING id INTO equipo_id;

  INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Accesorios', 'equipo-accesorios', equipo_id, 10),
  ('Máquinas', 'equipo-maquinas', equipo_id, 20);

  -- ==========================================
  -- 6. Profesionales
  -- ==========================================
  INSERT INTO public.categories (name, slug, sort_order) VALUES ('Profesionales', 'profesionales', 60)
  RETURNING id INTO profesionales_id;

  INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Estilistas', 'profesionales-estilistas', profesionales_id, 10),
  ('Manicuristas', 'profesionales-manicuristas', profesionales_id, 20),
  ('Pedicuristas', 'profesionales-pedicuristas', profesionales_id, 30),
  ('Waxers', 'profesionales-waxers', profesionales_id, 40),
  ('Maquillistas', 'profesionales-maquillistas', profesionales_id, 50),
  ('Spa', 'profesionales-spa', profesionales_id, 60),
  ('Lashistas', 'profesionales-lashistas', profesionales_id, 70),
  ('Barbers', 'profesionales-barbers', profesionales_id, 80);

  -- ==========================================
  -- 7. Men's Care
  -- ==========================================
  INSERT INTO public.categories (name, slug, sort_order) VALUES ('Men''s Care', 'mens-care', 70)
  RETURNING id INTO mens_care_id;

  INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Peinado y Estilizado', 'mens-care-peinado-estilizado', mens_care_id, 10),
  ('Barba y Bigote', 'mens-care-barba-bigote', mens_care_id, 20),
  ('Shampoos y Tratamientos', 'mens-care-shampoos-tratamientos', mens_care_id, 30),
  ('Skincare', 'mens-care-skincare', mens_care_id, 40),
  ('Accesorios', 'mens-care-accesorios', mens_care_id, 50);

END $$;
