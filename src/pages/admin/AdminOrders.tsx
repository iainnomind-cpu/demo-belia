import { useOrderStore } from '../../store/orderStore';

export function AdminOrders() {
  const { orders, updateOrderStatus } = useOrderStore();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Gestión de Pedidos</h1>
      
      <div className="bg-white border border-divider rounded-xl shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-30">inbox</span>
            <p>No hay pedidos recientes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-divider text-xs uppercase text-text-meta">
                  <th className="p-4 font-bold">ID Pedido</th>
                  <th className="p-4 font-bold">Cliente</th>
                  <th className="p-4 font-bold">Fecha</th>
                  <th className="p-4 font-bold">Total</th>
                  <th className="p-4 font-bold">Estado</th>
                  <th className="p-4 font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-sm">{order.id}</td>
                    <td className="p-4">
                      <p className="font-medium text-sm">{order.customer.name}</p>
                      <p className="text-xs text-text-meta">{order.customer.email}</p>
                      <p className="text-xs text-text-meta">{order.customer.phone}</p>
                    </td>
                    <td className="p-4 text-sm text-text-secondary">{new Date(order.date).toLocaleDateString()}</td>
                    <td className="p-4 font-bold text-belia-red">${order.total.toFixed(2)}</td>
                    <td className="p-4">
                      <select 
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                        className={`text-xs font-bold px-2 py-1 rounded-full border outline-none cursor-pointer ${
                          order.status === 'Procesando' ? 'bg-amber-100 text-amber-800 border-amber-200' : 
                          order.status === 'Enviado' ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                          'bg-green-100 text-green-800 border-green-200'
                        }`}
                      >
                        <option value="Procesando">Procesando</option>
                        <option value="Enviado">Enviado</option>
                        <option value="Entregado">Entregado</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <button onClick={() => alert(`Dirección de envío:\n${order.shipping.address}\n${order.shipping.colony}, C.P. ${order.shipping.zip}\n${order.shipping.city}`)} className="text-belia-red hover:text-belia-red-deep text-sm font-medium">Ver dirección</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
