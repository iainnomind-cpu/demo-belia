import { useMemo } from 'react';
import { useOrderStore } from '../../store/orderStore';

interface CustomerSummary {
  email: string;
  name: string;
  phone: string;
  totalSpent: number;
  ordersCount: number;
  lastOrderDate: string;
}

export function AdminCustomers() {
  const { orders } = useOrderStore();

  // Agrupamos y calculamos los datos de clientes al vuelo
  const customers = useMemo(() => {
    const customerMap = new Map<string, CustomerSummary>();

    orders.forEach(order => {
      const email = order.customer.email.toLowerCase();
      if (!customerMap.has(email)) {
        customerMap.set(email, {
          email: order.customer.email,
          name: order.customer.name,
          phone: order.customer.phone,
          totalSpent: 0,
          ordersCount: 0,
          lastOrderDate: order.date
        });
      }

      const summary = customerMap.get(email)!;
      summary.totalSpent += order.total;
      summary.ordersCount += 1;
      
      // Actualizar la fecha si este pedido es más reciente
      if (new Date(order.date) > new Date(summary.lastOrderDate)) {
        summary.lastOrderDate = order.date;
        // También actualizamos datos de contacto al más reciente por si cambiaron
        summary.name = order.customer.name;
        summary.phone = order.customer.phone;
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const handleCampaignClick = () => {
    alert("¡Campaña enviada!\n\nSe ha enviado una promoción de descuento al correo de estos clientes de forma exitosa (Simulación).");
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">CRM / Clientes</h1>
          <p className="text-sm text-text-secondary mt-1">Gestiona tu cartera de clientes y su valor de por vida (LTV).</p>
        </div>
        <button 
          onClick={handleCampaignClick}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm">mail</span>
          Campaña Email
        </button>
      </div>
      
      <div className="bg-white border border-divider rounded-xl shadow-sm overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-30">group_off</span>
            <p>Aún no tienes clientes registrados.</p>
            <p className="text-xs mt-1">Los clientes aparecerán automáticamente cuando alguien realice una compra.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-divider text-xs uppercase text-text-meta">
                  <th className="p-4 font-bold">Cliente</th>
                  <th className="p-4 font-bold">Contacto</th>
                  <th className="p-4 font-bold text-center">Pedidos</th>
                  <th className="p-4 font-bold">Total Gastado</th>
                  <th className="p-4 font-bold">Última Compra</th>
                  <th className="p-4 font-bold">Etiqueta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {customers.map(customer => {
                  const isVip = customer.totalSpent > 3000 || customer.ordersCount > 2;
                  
                  return (
                    <tr key={customer.email} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-sm text-text-primary">{customer.name}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-text-secondary">{customer.email}</p>
                        <p className="text-xs text-text-meta mt-0.5">{customer.phone}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-gray-100 text-gray-800 text-xs font-bold px-2 py-1 rounded-full">
                          {customer.ordersCount}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-belia-red">${customer.totalSpent.toFixed(2)}</td>
                      <td className="p-4 text-sm text-text-secondary">
                        {new Date(customer.lastOrderDate).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        {isVip ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase px-2 py-1 rounded border border-amber-200">
                            VIP
                          </span>
                        ) : (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold uppercase px-2 py-1 rounded border border-blue-200">
                            Regular
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
