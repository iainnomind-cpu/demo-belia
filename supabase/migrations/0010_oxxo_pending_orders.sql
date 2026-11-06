-- ============================================================
-- BELIA PLATFORM — OXXO: orders waiting for a cash payment
-- Migration: 0010_oxxo_pending_orders.sql
-- Run once in Supabase → SQL Editor.
--
-- An OXXO voucher creates the order as 'Pendiente de pago' and reserves its
-- stock. Paying it moves the order to 'Procesando'; if it expires the order
-- is cancelled and the stock goes back.
-- ============================================================

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('Pendiente de pago', 'Procesando', 'Enviado', 'Entregado', 'Cancelado'));

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_voucher_url TEXT;

CREATE OR REPLACE FUNCTION public.increment_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.products
  SET stock = stock + p_quantity
  WHERE id = p_product_id;
$$;

REVOKE ALL ON FUNCTION public.increment_stock(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_stock(UUID, INTEGER) TO service_role;
