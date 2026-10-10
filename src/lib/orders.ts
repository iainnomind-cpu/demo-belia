import { supabase } from './supabase';
import type { Order } from '../types/database';

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

/** orders.tracking_info is { text: "Estafeta 123456789" } (set by the admin when marking "Enviado") */
export const trackingText = (tracking: unknown): string | null => {
  const text = (tracking as { text?: string } | null)?.text?.trim();
  return text || null;
};

export const formatAddress = (s: OrderShipping) =>
  [s.street, s.city, s.state, s.zip && `C.P. ${s.zip}`].filter(Boolean).join(', ');

/** Customer-facing label and style for each order status */
export const STATUS_STYLES: Record<Order['status'], { label: string; className: string; icon: string }> = {
  Procesando: { label: 'Preparando tu pedido', className: 'bg-yellow-100 text-yellow-800', icon: 'inventory_2' },
  Enviado: { label: 'En camino', className: 'bg-blue-100 text-blue-800', icon: 'local_shipping' },
  Entregado: { label: 'Entregado', className: 'bg-success-container text-success-green', icon: 'check_circle' },
  Cancelado: { label: 'Cancelado', className: 'bg-error/10 text-error', icon: 'cancel' },
};

