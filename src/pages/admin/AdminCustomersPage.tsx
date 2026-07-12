import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Helper interface for customer aggregation
interface CustomerAggregate {
  user_id: string;
  total_orders: number;
  ltv: number;
  last_order_date: string;
}

export function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [vipThreshold, setVipThreshold] = useState(3000); // default 3000 MXN

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // 1. Fetch VIP threshold from site_content
      const contentData = (await supabase
        .from('site_content')
        .select('content')
        .eq('id', 'vip_threshold')
        .single()).data as any;
        
      if (contentData?.content?.value) {
        setVipThreshold(Number(contentData.content.value));
      }

      // 2. Fetch all completed/delivered orders to aggregate LTV
      const orders = (await supabase
        .from('orders')
        .select('user_id, total_amount, created_at')
        .in('status', ['Procesando', 'Enviado', 'Entregado'])).data as any[];

      if (orders) {
        const agg: Record<string, CustomerAggregate> = {};
        for (const o of orders) {
          if (!agg[o.user_id]) {
            agg[o.user_id] = { user_id: o.user_id, total_orders: 0, ltv: 0, last_order_date: o.created_at };
          }
          agg[o.user_id].total_orders++;
          agg[o.user_id].ltv += o.total_amount;
          if (new Date(o.created_at) > new Date(agg[o.user_id].last_order_date)) {
            agg[o.user_id].last_order_date = o.created_at;
          }
        }
        setCustomers(Object.values(agg).sort((a, b) => b.ltv - a.ltv));
      }
      
      setLoading(false);
    };

    void fetchData();
  }, []);

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-headline-lg text-2xl font-bold text-text-primary">Clientes y LTV</h1>
          <p className="text-sm text-text-secondary mt-1">Umbral VIP actual: {formatPrice(vipThreshold)} MXN</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-divider overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-text-secondary font-medium border-b border-divider uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">ID Usuario</th>
                <th className="px-6 py-4">Total Pedidos</th>
                <th className="px-6 py-4">Último Pedido</th>
                <th className="px-6 py-4">LTV (Total Gastado)</th>
                <th className="px-6 py-4">Segmento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-text-meta">Cargando clientes...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-text-meta">No hay clientes con pedidos válidos.</td></tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.user_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-text-secondary truncate max-w-[200px]" title={c.user_id}>
                      {c.user_id}
                    </td>
                    <td className="px-6 py-4 text-text-primary font-medium">
                      {c.total_orders}
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {new Date(c.last_order_date).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-6 py-4 font-bold text-text-primary">
                      {formatPrice(c.ltv)}
                    </td>
                    <td className="px-6 py-4">
                      {c.ltv >= vipThreshold ? (
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 w-max">
                          <span className="material-symbols-outlined text-[14px]">stars</span>
                          VIP
                        </span>
                      ) : (
                        <span className="text-text-meta text-xs uppercase tracking-wider">Regular</span>
                      )}
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
