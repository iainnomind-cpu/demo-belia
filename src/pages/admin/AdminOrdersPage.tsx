import { Fragment, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../types/database';
import { formatPrice } from '../../lib/pricing';
import { fetchOrderItems, formatAddress, orderNumber, type OrderItemDetail, type OrderShipping } from '../../lib/orders';

function OrderDetail({ order }: { order: Order }) {
  const [items, setItems] = useState<OrderItemDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shipping = (order.shipping_address ?? {}) as OrderShipping;

  useEffect(() => {
    fetchOrderItems(order.id).then(setItems).catch((e: Error) => setError(e.message));
  }, [order.id]);

  const subtotal = (items ?? []).reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const shippingCost = Math.max(0, Math.round((order.total_amount - subtotal) * 100) / 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-surface-bright">
      {/* Products */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-divider p-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">Productos</h4>
        {error && <p className="text-sm text-error">No se pudieron cargar los productos: {error}</p>}
        {!items && !error && <p className="text-sm text-text-meta">Cargando…</p>}
        {items && items.length === 0 && <p className="text-sm text-text-meta">Este pedido no tiene productos registrados.</p>}
        {items && items.length > 0 && (
          <>
            <table className="w-full text-sm">
              <thead className="text-xs text-text-meta">
                <tr>
                  <th className="text-left font-medium pb-2">Producto</th>
                  <th className="text-right font-medium pb-2">Cant.</th>
                  <th className="text-right font-medium pb-2">Precio</th>
                  <th className="text-right font-medium pb-2">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="py-2">
                      <div className="flex items-center gap-3">
                        <img src={item.product?.image_url || 'https://placehold.co/80x80?text=%20'} alt="" className="w-10 h-10 rounded object-contain border border-divider bg-surface-dim" />
                        <div>
                          <p className="font-medium text-text-primary line-clamp-1">{item.product?.name ?? 'Producto eliminado'}</p>
                          <p className="text-xs font-mono text-text-meta">{item.product?.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{formatPrice(item.unit_price)}</td>
                    <td className="py-2 text-right font-medium">{formatPrice(item.unit_price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-divider mt-3 pt-3 text-sm space-y-1 max-w-xs ml-auto">
              <div className="flex justify-between text-text-secondary"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between text-text-secondary"><span>Envío</span><span>{shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}</span></div>
              <div className="flex justify-between font-bold text-text-primary"><span>Total cobrado</span><span>{formatPrice(order.total_amount)}</span></div>
            </div>
          </>
        )}
      </div>

      {/* Customer + shipping + payment */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-divider p-5 text-sm space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Cliente y envío</h4>
          <p className="font-semibold text-text-primary">{shipping.name || 'Sin nombre (pedido anterior al cambio)'}</p>
          {shipping.email && <p className="text-text-secondary"><a href={`mailto:${shipping.email}`} className="hover:text-belia-red">{shipping.email}</a></p>}
          {shipping.phone && <p className="text-text-secondary"><a href={`tel:${shipping.phone}`} className="hover:text-belia-red">{shipping.phone}</a></p>}
          <p className="text-text-secondary pt-1">{formatAddress(shipping) || 'Sin dirección'}</p>
        </div>
        <div className="bg-white rounded-xl border border-divider p-5 text-sm space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Pago</h4>
          <p className="text-text-secondary">Tipo: <span className="font-medium text-text-primary">{order.tipo === 'mayoreo' ? 'Mayoreo (B2B)' : 'Público'}</span></p>
          <p className="text-text-secondary">Fecha: <span className="text-text-primary">{new Date(order.created_at).toLocaleString('es-MX')}</span></p>
          {order.stripe_payment_intent && (
            <p className="text-text-secondary break-all">Stripe: <span className="font-mono text-xs text-text-primary">{order.stripe_payment_intent}</span></p>
          )}
          <p className="text-xs text-text-meta font-mono pt-1 break-all">ID cliente: {order.user_id}</p>
        </div>
      </div>
    </div>
  );
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) alert('Error cargando pedidos: ' + error.message);
    if (data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    if (newStatus === 'Cancelado' && !confirm('¿Cancelar este pedido? No se puede deshacer.')) return;
    const previous = orders;
    // Optimistic update
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    // DB Update (revert if it fails)
    const { error } = await (supabase.from('orders') as any).update({ status: newStatus }).eq('id', orderId);
    if (error) {
      setOrders(previous);
      alert('No se pudo actualizar el pedido: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Procesando': return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded uppercase tracking-wider">Procesando</span>;
      case 'Enviado': return <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded uppercase tracking-wider">Enviado</span>;
      case 'Entregado': return <span className="bg-success-container text-success-green text-xs font-medium px-2.5 py-0.5 rounded uppercase tracking-wider">Entregado</span>;
      case 'Cancelado': return <span className="bg-error/10 text-error text-xs font-medium px-2.5 py-0.5 rounded uppercase tracking-wider">Cancelado</span>;
      default: return <span>{status}</span>;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-headline-lg text-2xl font-bold text-text-primary">Gestión de Pedidos</h1>
        <button onClick={fetchOrders} className="p-2 bg-surface-container rounded-lg hover:bg-gray-200 transition-colors" title="Actualizar">
          <span className="material-symbols-outlined text-text-secondary">refresh</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-divider overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-text-secondary font-medium border-b border-divider uppercase tracking-wider text-xs">
              <tr>
                <th className="px-4 py-4 w-8"></th>
                <th className="px-4 py-4">Pedido</th>
                <th className="px-4 py-4">Fecha</th>
                <th className="px-4 py-4">Cliente</th>
                <th className="px-4 py-4">Total</th>
                <th className="px-4 py-4">Estado</th>
                <th className="px-4 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-text-meta">Cargando pedidos...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-text-meta">No hay pedidos registrados.</td></tr>
              ) : (
                orders.map((order) => {
                  const shipping = (order.shipping_address ?? {}) as OrderShipping;
                  const isOpen = expanded === order.id;
                  return (
                    <Fragment key={order.id}>
                      <tr
                        className={`cursor-pointer transition-colors ${isOpen ? 'bg-surface-container/40' : 'hover:bg-gray-50'}`}
                        onClick={() => setExpanded(isOpen ? null : order.id)}
                      >
                        <td className="px-4 py-4 text-text-meta">
                          <span className={`material-symbols-outlined text-[20px] transition-transform ${isOpen ? 'rotate-90' : ''}`}>chevron_right</span>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs font-bold text-text-primary">#{orderNumber(order.id)}</td>
                        <td className="px-4 py-4 text-text-primary whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString('es-MX')}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-text-primary font-medium">{shipping.name || '—'}</div>
                          <div className="text-xs text-text-meta">{shipping.email || `${order.user_id.split('-')[0]}…`}</div>
                        </td>
                        <td className="px-4 py-4 font-bold text-text-primary">
                          {formatPrice(order.total_amount)}
                        </td>
                        <td className="px-4 py-4">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                            className="text-xs border-gray-300 rounded-md focus:ring-belia-red focus:border-belia-red py-1 pl-2 pr-6"
                            disabled={order.status === 'Cancelado' || order.status === 'Entregado'}
                          >
                            <option value="Procesando">Marcar Procesando</option>
                            <option value="Enviado" disabled={order.status !== 'Procesando'}>Marcar Enviado</option>
                            <option value="Entregado" disabled={order.status !== 'Enviado'}>Marcar Entregado</option>
                            <option value="Cancelado" disabled={order.status === 'Entregado'}>Cancelar</option>
                          </select>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={7} className="p-0 border-t border-divider">
                            <OrderDetail order={order} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
