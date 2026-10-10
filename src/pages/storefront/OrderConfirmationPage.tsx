import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { formatPrice } from '../../lib/pricing';
import { fetchOrderItems, formatAddress, orderNumber, type OrderItemDetail, type OrderShipping } from '../../lib/orders';
import type { Order } from '../../types/database';

/**
 * OrderConfirmationPage — Shown after a successful payment (/pedido/:id).
 * Customers can only read their own orders (RLS), so the link is private.
 */
export function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItemDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      const { data } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
      if (!data) {
        setNotFound(true);
      } else {
        setOrder(data);
        setItems(await fetchOrderItems(id).catch(() => []));
      }
      setLoading(false);
    };
    void load();
  }, [id, user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: `/pedido/${id}` }} />;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-t-4 border-belia-red rounded-full" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-belia-charcoal mb-2">Pedido no encontrado</h2>
        <p className="text-text-secondary text-sm mb-6">Este pedido no existe o pertenece a otra cuenta.</p>
        <Link to="/" className="btn-primary">Volver a la tienda</Link>
      </div>
    );
  }

  const shipping = (order.shipping_address ?? {}) as OrderShipping;
  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const shippingCost = Math.max(0, Math.round((order.total_amount - subtotal) * 100) / 100);

  return (
    <div className="bg-belia-cream min-h-screen py-10 md:py-16">
      <div className="container-belia max-w-3xl">
        {/* ─── Thank you ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl border border-divider shadow-belia-sm p-8 md:p-10 text-center mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
            className="mx-auto w-20 h-20 rounded-full bg-success-green/10 flex items-center justify-center mb-5"
          >
            <span className="material-symbols-outlined text-5xl text-success-green">check_circle</span>
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-belia-charcoal mb-2">
            ¡Gracias por tu compra{shipping.name ? `, ${shipping.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-text-secondary mb-6">
            Recibimos tu pago y ya estamos preparando tu pedido.
          </p>
          <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-6 bg-belia-blush rounded-2xl px-6 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-text-meta">Número de pedido</p>
              <p className="text-xl font-extrabold text-belia-red font-mono">#{orderNumber(order.id)}</p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-belia-pink/30" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-text-meta">Total pagado</p>
              <p className="text-xl font-extrabold text-belia-charcoal">{formatPrice(order.total_amount)}</p>
            </div>
          </div>
          <p className="text-xs text-text-meta mt-4">Guarda tu número de pedido para cualquier aclaración.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* ─── Items ───────────────────────────────── */}
          <div className="md:col-span-3 bg-white rounded-2xl border border-divider p-6">
            <h2 className="font-bold text-belia-charcoal mb-4">Resumen del pedido</h2>
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex gap-3 items-center">
                  <img
                    src={item.product?.image_url || 'https://placehold.co/80x80/FFF0F3/F6423C?text=%20'}
                    alt={item.product?.name ?? ''}
                    className="w-14 h-14 object-contain bg-belia-cream rounded-lg border border-divider p-1 mix-blend-multiply"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-belia-charcoal line-clamp-2">{item.product?.name ?? 'Producto'}</p>
                    <p className="text-xs text-text-meta">Cant: {item.quantity} × {formatPrice(item.unit_price)}</p>
                  </div>
                  <p className="text-sm font-bold text-belia-charcoal">{formatPrice(item.unit_price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-divider mt-5 pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-text-secondary"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between text-text-secondary">
                <span>Envío</span>
                <span>{shippingCost === 0 ? <span className="text-success-green font-semibold">Gratis</span> : formatPrice(shippingCost)}</span>
              </div>
              <div className="flex justify-between font-bold text-belia-charcoal text-base pt-1"><span>Total</span><span>{formatPrice(order.total_amount)}</span></div>
            </div>
          </div>

          {/* ─── Shipping ────────────────────────────── */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-divider p-6">
              <h2 className="font-bold text-belia-charcoal mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-belia-red text-[20px]">local_shipping</span>
                Envío a
              </h2>
              {shipping.name && <p className="text-sm font-semibold text-belia-charcoal">{shipping.name}</p>}
              <p className="text-sm text-text-secondary">{formatAddress(shipping)}</p>
              {shipping.phone && <p className="text-sm text-text-secondary mt-1">Tel. {shipping.phone}</p>}
            </div>
            <div className="bg-white rounded-2xl border border-divider p-6">
              <h2 className="font-bold text-belia-charcoal mb-2">Estado</h2>
              <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider">{order.status}</span>
              <p className="text-xs text-text-meta mt-3">
                ¿Dudas con tu pedido? Escríbenos mencionando tu número de pedido.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link to="/" className="btn-primary">
            Seguir comprando
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
