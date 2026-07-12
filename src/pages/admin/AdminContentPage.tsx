import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface SiteContent {
  id: string;
  type: string;
  content: any;
}

export function AdminContentPage() {
  const [contents, setContents] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchContent = async () => {
    setLoading(true);
    const { data } = await supabase.from('site_content').select('*').order('id');
    if (data) setContents(data);
    setLoading(false);
  };

  useEffect(() => {
    void fetchContent();
  }, []);

  const handleSave = async (id: string, newContent: any) => {
    setSaving(id);
    await supabase.from('site_content').update({ content: newContent }).eq('id', id);
    setContents(contents.map(c => c.id === id ? { ...c, content: newContent } : c));
    setSaving(null);
  };

  const getBanners = () => contents.filter(c => c.type === 'banner');
  const getSettings = () => contents.filter(c => c.type === 'setting');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-headline-lg text-2xl font-bold text-text-primary">Gestión de Contenido</h1>
        <button onClick={fetchContent} className="p-2 bg-surface-container rounded-lg hover:bg-gray-200 transition-colors" title="Actualizar">
          <span className="material-symbols-outlined text-text-secondary">refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Banners Section */}
        <div className="space-y-6">
          <h2 className="font-headline-sm text-xl font-bold text-text-primary border-b border-divider pb-2">Banners de Inicio</h2>
          
          {loading ? (
            <p className="text-text-meta text-sm">Cargando...</p>
          ) : getBanners().length === 0 ? (
            <p className="text-text-meta text-sm">No hay banners configurados.</p>
          ) : (
            getBanners().map(banner => (
              <div key={banner.id} className="bg-white rounded-xl border border-divider p-6 shadow-sm">
                <h3 className="font-bold text-text-primary mb-4 capitalize">{banner.id.replace(/_/g, ' ')}</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Título</label>
                    <input 
                      type="text" 
                      value={banner.content.title || ''}
                      onChange={e => setContents(contents.map(c => c.id === banner.id ? { ...c, content: { ...c.content, title: e.target.value } } : c))}
                      className="w-full text-sm border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Subtítulo</label>
                    <input 
                      type="text" 
                      value={banner.content.subtitle || ''}
                      onChange={e => setContents(contents.map(c => c.id === banner.id ? { ...c, content: { ...c.content, subtitle: e.target.value } } : c))}
                      className="w-full text-sm border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">URL de Imagen</label>
                    <input 
                      type="text" 
                      value={banner.content.image_url || ''}
                      onChange={e => setContents(contents.map(c => c.id === banner.id ? { ...c, content: { ...c.content, image_url: e.target.value } } : c))}
                      className="w-full text-sm border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                    />
                    {banner.content.image_url && (
                      <div className="mt-2 relative h-32 rounded bg-surface-dim overflow-hidden border border-divider">
                        <img src={banner.content.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => handleSave(banner.id, banner.content)}
                    disabled={saving === banner.id}
                    className="w-full bg-surface-container text-belia-red font-bold py-2 rounded-lg hover:bg-belia-red hover:text-white transition-colors disabled:opacity-50"
                  >
                    {saving === banner.id ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Settings Section */}
        <div className="space-y-6">
          <h2 className="font-headline-sm text-xl font-bold text-text-primary border-b border-divider pb-2">Configuración General</h2>
          
          {loading ? (
            <p className="text-text-meta text-sm">Cargando...</p>
          ) : getSettings().length === 0 ? (
            <p className="text-text-meta text-sm">No hay configuraciones.</p>
          ) : (
            getSettings().map(setting => (
              <div key={setting.id} className="bg-white rounded-xl border border-divider p-6 shadow-sm">
                <h3 className="font-bold text-text-primary mb-4 capitalize">{setting.id.replace(/_/g, ' ')}</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Valor</label>
                    <input 
                      type="text" 
                      value={setting.content.value || ''}
                      onChange={e => setContents(contents.map(c => c.id === setting.id ? { ...c, content: { ...c.content, value: e.target.value } } : c))}
                      className="w-full text-sm border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                    />
                  </div>
                  <button 
                    onClick={() => handleSave(setting.id, setting.content)}
                    disabled={saving === setting.id}
                    className="w-full bg-surface-container text-belia-red font-bold py-2 rounded-lg hover:bg-belia-red hover:text-white transition-colors disabled:opacity-50"
                  >
                    {saving === setting.id ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
      </div>
    </div>
  );
}
