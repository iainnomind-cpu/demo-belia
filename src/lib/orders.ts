import { supabase } from './supabase';

/** Shape of orders.shipping_address as saved by the confirm-order Edge Function */
export interface OrderShipping {
  name?: string;
  phone?: string;
  email?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface OrderItemDetail {
  id: string;
  quantity: number;
  unit_price: number;
  product: { name: string; sku: string; image_url: string | null } | null;
}

/** Items of an order with their product info. RLS lets customers read their own orders and admins all. */
export async function fetchOrderItems(orderId: string): Promise<OrderItemDetail[]> {
  const { data, error } = await (supabase.from('order_items') as any)
    .select('id, quantity, unit_price, product:products(name, sku, image_url)')
    .eq('order_id', orderId);
  if (error) throw new Error(error.message);
  return (data ?? []) as OrderItemDetail[];
}

/** "7ff3f0ad-…" → "7FF3F0AD": short, readable order number */
export const orderNumber = (id: string) => id.split('-')[0].toUpperCase();

export const formatAddress = (s: OrderShipping) =>
  [s.street, s.city, s.state, s.zip && `C.P. ${s.zip}`].filter(Boolean).join(', ');
