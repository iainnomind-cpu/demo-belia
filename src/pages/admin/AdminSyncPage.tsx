import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { SyncLog } from '../../types/database';
import { useAuth } from '../../hooks/useAuth';

export function AdminSyncPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string; details?: any } | null>(null);
  const { session } = useAuth();

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);
    
    if (data) setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    void fetchLogs();
  }, []);

  const handleSync = async (confirmed: boolean = false) => {
    if (!session) return;
    
    setSyncing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-catalog', {
        body: { confirmed },
      });

      if (error) throw error;
      setResult(data);
      if (confirmed) {
        await fetchLogs();
      }
    } catch (err: any) {
      setResult({ error: err.message || 'Error executing sync.' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-headline-lg text-2xl font-bold text-text-primary">Sincronización de Catálogo</h1>
          <p className="text-sm text-text-secondary mt-1">Sincroniza inventario y precios desde Google Sheets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Action Panel */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-divider p-6 shadow-sm h-max">
          <div className="flex items-center gap-3 text-belia-red mb-4 border-b border-divider pb-4">
            <span className="material-symbols-outlined text-3xl">sync</span>
            <h2 className="font-bold text-lg">Control de Sync</h2>
          </div>
          
          <p className="text-sm text-text-secondary mb-6 leading-relaxed">
            La sincronización actualizará el catálogo de productos basándose en <strong>PLANTILLA BELIA</strong> en Google Sheets. Los productos marcados como manuales no se verán afectados.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => handleSync(false)}
              disabled={syncing}
              className="w-full bg-surface-container text-belia-red font-bold py-3 rounded-lg hover:bg-belia-red hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {syncing && !result ? (
                <div className="animate-spin h-5 w-5 border-t-2 border-current rounded-full"></div>
              ) : (
                <span className="material-symbols-outlined text-[20px]">visibility</span>
              )}
              Previsualizar Cambios
            </button>

            <button
              onClick={() => {
                if (confirm('¿Estás seguro de que deseas aplicar los cambios en la base de datos? Esto afectará los precios y disponibilidad en vivo.')) {
                  handleSync(true);
                }
              }}
              disabled={syncing}
              className="w-full bg-belia-red text-white font-bold py-3 rounded-lg hover:bg-belia-red-deep transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
              Sincronizar Ahora
            </button>
          </div>
        </div>

        {/* Results / Logs Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Result */}
          {result && (
            <div className={`bg-white rounded-xl border ${result.error ? 'border-error' : 'border-success-green'} p-6 shadow-sm`}>
              <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${result.error ? 'text-error' : 'text-success-green'}`}>
                <span className="material-symbols-outlined">
                  {result.error ? 'error' : 'check_circle'}
                </span>
                {result.error ? 'Error en Sincronización' : (result as any).preview ? 'Vista Previa Generada' : 'Sincronización Completada'}
              </h3>

              {result.error ? (
                <p className="text-sm text-text-secondary bg-error/10 p-4 rounded font-mono">{result.error}</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-surface-bright p-4 rounded text-center">
                    <div className="text-2xl font-bold text-success-green">{(result as any).inserted || (result as any).toInsert}</div>
                    <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">Nuevos</div>
                  </div>
                  <div className="bg-surface-bright p-4 rounded text-center">
                    <div className="text-2xl font-bold text-blue-600">{(result as any).updated || (result as any).toUpdate}</div>
                    <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">Actualizados</div>
                  </div>
                  <div className="bg-surface-bright p-4 rounded text-center">
                    <div className="text-2xl font-bold text-error">{(result as any).deactivated || (result as any).toDeactivate}</div>
                    <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-1">Desactivados</div>
                  </div>
                  
                  {((result as any).skuConflicts?.length > 0) && (
                    <div className="col-span-3 mt-4 bg-yellow-50 p-4 rounded border border-yellow-200">
                      <p className="text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        Advertencia: SKUs Duplicados Ignorados
                      </p>
                      <p className="text-xs font-mono text-yellow-700">
                        {(result as any).skuConflicts.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* History */}
          <div className="bg-white rounded-xl border border-divider overflow-hidden shadow-sm">
            <div className="p-4 border-b border-divider bg-surface-bright flex justify-between items-center">
              <h3 className="font-bold text-text-primary">Historial Reciente</h3>
              <button onClick={fetchLogs} className="text-sm text-belia-red hover:underline font-medium">Actualizar historial</button>
            </div>
            
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-text-secondary font-medium border-b border-divider uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Resumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {loading ? (
                  <tr><td colSpan={3} className="px-6 py-8 text-center text-text-meta">Cargando...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-8 text-center text-text-meta">No hay registros.</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-text-primary whitespace-nowrap">
                        {new Date(log.started_at).toLocaleString('es-MX')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                          log.status === 'completado' ? 'bg-success-container text-success-green' :
                          log.status === 'error' ? 'bg-error/10 text-error' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-secondary">
                        {log.status === 'error' ? (
                          <span className="text-error truncate max-w-xs block" title={log.error_message || ''}>
                            {log.error_message}
                          </span>
                        ) : log.status === 'completado' ? (
                          <span className="text-xs font-mono">
                            +{log.inserted_count} / ~{log.updated_count} / -{log.deactivated_count}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
