import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { formatPrice } from '../../lib/pricing';
import { orderNumber, trackingText, STATUS_STYLES } from '../../lib/orders';
import type { Order } from '../../types/database';

/** MyOrdersPage — The logged-in customer's order history (/mis-pedidos). */
export function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Filter by user explicitly: admins can read every order through RLS
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    };
    void load();
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: '/mis-pedidos' }} />;

  return (
    <div className="bg-belia-cream min-h-screen py-10 md:py-16">
      <div className="container-belia max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-belia-charcoal mb-1">Mis pedidos</h1>
        <p className="text-sm text-text-secondary mb-8">{user.email}</p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-10 w-10 border-t-4 border-belia-red rounded-full" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-divider p-10 text-center">
            <span className="material-symbols-outlined text-5xl text-text-meta opacity-50">shopping_bag</span>
            <p className="font-bold text-belia-charcoal mt-3 mb-1">Aún no tienes pedidos</p>
            <p className="text-sm text-text-secondary mb-6">Cuando compres, aquí podrás ver el estado de tus envíos.</p>
            <Link to="/categoria/todos" className="btn-primary">Ver productos</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const status = STATUS_STYLES[order.status];
              const tracking = trackingText(order.tracking_info);
              return (
                <Link
                  key={order.id}
                  to={`/pedido/${order.id}`}
                  className="block bg-white rounded-2xl border border-divider p-5 hover:border-belia-coral hover:shadow-belia-sm transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono font-bold text-belia-charcoal">#{orderNumber(order.id)}</p>
                      <p className="text-xs text-text-meta">{new Date(order.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${status.className}`}>
                      <span className="material-symbols-outlined text-[14px]">{status.icon}</span>
                      {status.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-belia-charcoal">{formatPrice(order.total_amount)}</span>
                      <span className="material-symbols-outlined text-text-meta">chevron_right</span>
                    </div>
                  </div>
                  {tracking && <p className="text-xs text-text-secondary mt-3">Guía: <strong>{tracking}</strong></p>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
