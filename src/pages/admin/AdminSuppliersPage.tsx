import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Supplier } from '../../types/database';

export function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setSuppliers(data);
    setLoading(false);
  };

  useEffect(() => {
    void fetchSuppliers();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id);
    try {
      // In a full implementation this would call the /approve-supplier Edge Function 
      // which also creates the auth user. For this stub, we just update the status in the table.
      const newStatus = action === 'approve' ? 'aprobado' : 'rechazado';
      await supabase.from('suppliers').update({ status: newStatus } as any).eq('id', id);
      setSuppliers(suppliers.map(s => s.id === id ? { ...s, status: newStatus } : s));
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente': return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded uppercase tracking-wider">Pendiente</span>;
      case 'aprobado': return <span className="bg-success-container text-success-green text-xs font-medium px-2.5 py-0.5 rounded uppercase tracking-wider">Aprobado</span>;
      case 'rechazado': return <span className="bg-error/10 text-error text-xs font-medium px-2.5 py-0.5 rounded uppercase tracking-wider">Rechazado</span>;
      default: return <span>{status}</span>;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-headline-lg text-2xl font-bold text-text-primary">Solicitudes B2B</h1>
        <button onClick={fetchSuppliers} className="p-2 bg-surface-container rounded-lg hover:bg-gray-200 transition-colors" title="Actualizar">
          <span className="material-symbols-outlined text-text-secondary">refresh</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-divider overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-text-secondary font-medium border-b border-divider uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Empresa / Contacto</th>
                <th className="px-6 py-4">Datos de Contacto</th>
                <th className="px-6 py-4">Interés</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-text-meta">Cargando solicitudes...</td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-text-meta">No hay solicitudes B2B.</td></tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-text-primary">{supplier.company_name}</div>
                      <div className="text-text-secondary mt-1">{supplier.contact_name}</div>
                      {supplier.rfc && <div className="text-xs text-text-meta font-mono mt-1 uppercase">RFC: {supplier.rfc}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-text-secondary mb-1">
                        <span className="material-symbols-outlined text-[14px]">mail</span>
                        {supplier.email}
                      </div>
                      <div className="flex items-center gap-2 text-text-secondary">
                        <span className="material-symbols-outlined text-[14px]">call</span>
                        {supplier.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary max-w-[200px] truncate" title={supplier.category_interest || ''}>
                      {supplier.category_interest || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(supplier.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {supplier.status === 'pendiente' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleAction(supplier.id, 'reject')}
                            disabled={processing === supplier.id}
                            className="p-2 text-error hover:bg-error/10 rounded transition-colors disabled:opacity-50"
                            title="Rechazar"
                          >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                          </button>
                          <button 
                            onClick={() => handleAction(supplier.id, 'approve')}
                            disabled={processing === supplier.id}
                            className="p-2 text-success-green hover:bg-success-container rounded transition-colors disabled:opacity-50"
                            title="Aprobar (Creará usuario)"
                          >
                            <span className="material-symbols-outlined text-[20px]">check</span>
                          </button>
                        </div>
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
