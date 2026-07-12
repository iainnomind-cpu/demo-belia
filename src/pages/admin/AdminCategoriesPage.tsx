import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Category } from '../../types/database';

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (data) setCategories(data);
    setLoading(false);
  };

  useEffect(() => {
    void fetchCategories();
  }, []);

  const toggleActive = async (id: string, current: boolean) => {
    const updated = !current;
    setCategories(categories.map(c => c.id === id ? { ...c, is_active: updated } : c));
    await (supabase.from('categories') as any).update({ is_active: updated }).eq('id', id);
  };

  // Build tree for display
  const roots = categories.filter(c => !c.parent_id);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-headline-lg text-2xl font-bold text-text-primary">Estructura de Categorías</h1>
        <div className="flex gap-2">
          <button onClick={fetchCategories} className="p-2 bg-surface-container rounded-lg hover:bg-gray-200 transition-colors" title="Actualizar">
            <span className="material-symbols-outlined text-text-secondary">refresh</span>
          </button>
          <button className="flex items-center gap-2 bg-belia-red text-white px-4 py-2 rounded-lg font-bold hover:bg-belia-red-deep transition-colors">
            <span className="material-symbols-outlined text-sm">add</span>
            Nueva Categoría
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-divider p-6 shadow-sm">
        {loading ? (
          <div className="text-center text-text-meta py-8">Cargando categorías...</div>
        ) : (
          <div className="space-y-4">
            {roots.map(root => {
              const children = categories.filter(c => c.parent_id === root.id);
              return (
                <div key={root.id} className="border border-divider rounded-lg overflow-hidden">
                  <div className="bg-surface-bright p-4 flex items-center justify-between border-b border-divider">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-text-meta">folder</span>
                      <span className="font-bold text-text-primary">{root.name}</span>
                      <span className="text-xs text-text-meta font-mono bg-white px-2 border border-divider rounded">/{root.slug}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => toggleActive(root.id, root.is_active)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${root.is_active ? 'bg-success-green' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${root.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                  
                  {children.length > 0 && (
                    <div className="bg-white divide-y divide-divider">
                      {children.map(child => (
                        <div key={child.id} className="p-3 pl-12 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-text-meta text-sm">subdirectory_arrow_right</span>
                            <span className="text-sm font-medium text-text-primary">{child.name}</span>
                            <span className="text-xs text-text-meta font-mono">/{child.slug}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => toggleActive(child.id, child.is_active)}
                              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none ${child.is_active ? 'bg-success-green' : 'bg-gray-300'}`}
                            >
                              <span className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${child.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
