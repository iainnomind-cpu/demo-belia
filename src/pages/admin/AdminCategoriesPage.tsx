import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Category } from '../../types/database';

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', slug: '', parent_id: '' });
  const [saving, setSaving] = useState(false);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = {
      name: newCat.name,
      slug: newCat.slug,
      parent_id: newCat.parent_id || null,
      is_active: true
    };

    const { error } = await (supabase.from('categories') as any).insert([payload]);
    
    if (!error) {
      setShowModal(false);
      setNewCat({ name: '', slug: '', parent_id: '' });
      void fetchCategories();
    } else {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

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
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-belia-red text-white px-4 py-2 rounded-lg font-bold hover:bg-belia-red-deep transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Nueva Categoría
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-surface-bright">
              <h2 className="font-bold text-lg text-text-primary">Nueva Categoría</h2>
              <button onClick={() => setShowModal(false)} className="text-text-secondary hover:text-belia-red">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Nombre *</label>
                <input required type="text" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Slug (URL) *</label>
                <input required type="text" value={newCat.slug} onChange={e => setNewCat({...newCat, slug: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm" placeholder="ejemplo-categoria" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Categoría Padre (opcional)</label>
                <select value={newCat.parent_id} onChange={e => setNewCat({...newCat, parent_id: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm">
                  <option value="">-- Ninguna (Categoría Principal) --</option>
                  {roots.map(root => (
                    <option key={root.id} value={root.id}>{root.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-divider mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-belia-red text-white text-sm font-bold rounded-lg hover:bg-belia-red-deep disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
