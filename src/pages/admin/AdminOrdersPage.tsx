import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../types/database';

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    // Real implementation would join with users table for customer email, 
    // for now we just show user_id or handle it basically since auth.users isn't easily joinable directly 
    // without a public profiles table. We will stick to the basic requirements.
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    // Optimistic update
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    
    // DB Update
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
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

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

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
                <th className="px-6 py-4">ID Pedido</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Cliente (ID)</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-text-meta">Cargando pedidos...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-text-meta">No hay pedidos registrados.</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-text-secondary">
                      {order.id.split('-')[0]}...
                    </td>
                    <td className="px-6 py-4 text-text-primary whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-6 py-4 text-text-secondary font-mono text-xs truncate max-w-[120px]" title={order.user_id}>
                      {order.user_id.split('-')[0]}...
                    </td>
                    <td className="px-6 py-4 font-bold text-text-primary">
                      {formatPrice(order.total_amount)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
