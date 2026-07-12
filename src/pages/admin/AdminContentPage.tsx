import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface SiteContent {
  id: string;
  content_data: any;
}

export function AdminContentPage() {
  const [contents, setContents] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<Record<string, File>>({});

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
    
    let finalContent = { ...newContent };
    const fileToUpload = imageFiles[id];

    if (fileToUpload) {
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${id}_${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, fileToUpload);
        
      if (uploadError) {
        alert('Error subiendo imagen: ' + uploadError.message);
        setSaving(null);
        return;
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);
        
      finalContent.image_url = publicUrlData.publicUrl;
    }

    await (supabase.from('site_content') as any).update({ content_data: finalContent }).eq('id', id);
    setContents(contents.map(c => c.id === id ? { ...c, content_data: finalContent } : c));
    
    if (fileToUpload) {
      setImageFiles(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    
    setSaving(null);
  };

  const getBanners = () => contents.filter(c => c.id.includes('banner') || c.id.includes('carousel'));
  const getSettings = () => contents.filter(c => !c.id.includes('banner') && !c.id.includes('carousel'));

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
                      value={banner.content_data.title || ''}
                      onChange={e => setContents(contents.map(c => c.id === banner.id ? { ...c, content_data: { ...c.content_data, title: e.target.value } } : c))}
                      className="w-full text-sm border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Subtítulo</label>
                    <input 
                      type="text" 
                      value={banner.content_data.subtitle || ''}
                      onChange={e => setContents(contents.map(c => c.id === banner.id ? { ...c, content_data: { ...c.content_data, subtitle: e.target.value } } : c))}
                      className="w-full text-sm border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Imagen del Banner</label>
                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setImageFiles(prev => ({ ...prev, [banner.id]: e.target.files![0] }));
                          }
                        }}
                        className="flex-1 border border-gray-300 rounded-lg text-sm p-1.5 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-belia-red/10 file:text-belia-red hover:file:bg-belia-red/20"
                      />
                      <div className="flex items-center text-xs text-text-meta px-2">o</div>
                      <input 
                        type="text" 
                        placeholder="URL web (opcional)"
                        value={banner.content_data.image_url || ''}
                        onChange={e => setContents(contents.map(c => c.id === banner.id ? { ...c, content_data: { ...c.content_data, image_url: e.target.value } } : c))}
                        className="flex-1 text-sm border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                        disabled={!!imageFiles[banner.id]}
                      />
                    </div>
                    {banner.content_data.image_url && !imageFiles[banner.id] && (
                      <div className="mt-2 relative h-32 rounded bg-surface-dim overflow-hidden border border-divider">
                        <img src={banner.content_data.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {imageFiles[banner.id] && (
                      <div className="mt-2 text-xs text-belia-red">
                        Nueva imagen seleccionada: {imageFiles[banner.id].name} (se subirá al guardar)
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => handleSave(banner.id, banner.content_data)}
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
                      value={setting.content_data.value || ''}
                      onChange={e => setContents(contents.map(c => c.id === setting.id ? { ...c, content_data: { ...c.content_data, value: e.target.value } } : c))}
                      className="w-full text-sm border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                    />
                  </div>
                  <button 
                    onClick={() => handleSave(setting.id, setting.content_data)}
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
