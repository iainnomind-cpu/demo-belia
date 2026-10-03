import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { CarouselSlide, HeroContent } from '../../hooks/useSiteContent';

// One shape covers every block: hero fields, carousel slides or a simple { value } setting
type ContentData = HeroContent & { slides?: CarouselSlide[]; value?: string };

interface SiteContent {
  id: string;
  content_data: ContentData;
}

const HERO_ID = 'home_banner_main';
const CAROUSEL_ID = 'home_carousel';

const SETTING_LABELS: Record<string, { label: string; help: string }> = {
  vip_threshold: { label: 'Umbral VIP (MXN)', help: 'Un cliente recibe la insignia VIP cuando la suma de sus compras supera este monto.' },
};

const inputClass = 'w-full text-sm border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red';

// Images go to the public "products" bucket in Supabase Storage
async function uploadImage(file: File, folder: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('products').upload(path, file);
  if (error) {
    throw new Error(`${error.message}. Revisa que exista un bucket público llamado "products" en Supabase Storage.`);
  }
  return supabase.storage.from('products').getPublicUrl(path).data.publicUrl;
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
      {children}
      {help && <p className="text-[11px] text-text-meta mt-1">{help}</p>}
    </div>
  );
}

function ImageField({ value, onChange, folder }: { value: string; onChange: (url: string) => void; folder: string }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      onChange(await uploadImage(file, folder));
    } catch (err) {
      alert('Error subiendo imagen: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }}
          className="flex-1 border border-gray-300 rounded-lg text-sm p-1.5 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-belia-red/10 file:text-belia-red hover:file:bg-belia-red/20"
        />
        <input
          type="url"
          placeholder="o pega una URL de imagen"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`flex-1 ${inputClass}`}
        />
      </div>
      {uploading && <p className="text-xs text-belia-red mt-2">Subiendo imagen…</p>}
      {value && !uploading && (
        <div className="mt-2 relative h-32 rounded-lg bg-surface-dim overflow-hidden border border-divider">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-white/90 rounded-full w-7 h-7 flex items-center justify-center text-text-secondary hover:text-error shadow"
            title="Quitar imagen"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminContentPage() {
  const [contents, setContents] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const fetchContent = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('site_content').select('*').order('id');
    if (error) alert('Error cargando contenido: ' + error.message);
    if (data) setContents(data);
    setLoading(false);
  };

  useEffect(() => {
    void fetchContent();
  }, []);

  const getData = (id: string) => contents.find(c => c.id === id)?.content_data ?? {};

  const setData = (id: string, content_data: ContentData) => {
    setContents(prev => prev.some(c => c.id === id)
      ? prev.map(c => c.id === id ? { ...c, content_data } : c)
      : [...prev, { id, content_data }]);
  };

  const handleSave = async (id: string) => {
    setSaving(id);
    // upsert: creates the block if it was never seeded
    const { error } = await (supabase.from('site_content') as any)
      .upsert({ id, content_data: getData(id), updated_at: new Date().toISOString() });
    setSaving(null);
    if (error) {
      alert('No se pudo guardar: ' + error.message);
      return;
    }
    setSavedId(id);
    setTimeout(() => setSavedId(cur => (cur === id ? null : cur)), 2500);
  };

  const renderSave = (id: string, label = 'Guardar cambios') => (
    <button
      onClick={() => handleSave(id)}
      disabled={saving === id}
      className={`w-full font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 ${
        savedId === id ? 'bg-success-green text-white' : 'bg-belia-red text-white hover:bg-belia-red-deep'
      }`}
    >
      {saving === id ? 'Guardando…' : savedId === id ? '✓ Guardado — ya se ve en la tienda' : label}
    </button>
  );

  // ── Hero ───────────────────────────────────────────────
  const hero: HeroContent = getData(HERO_ID);
  const setHero = (key: keyof HeroContent, value: string) => setData(HERO_ID, { ...hero, [key]: value });

  // ── Carousel ───────────────────────────────────────────
  const slides: CarouselSlide[] = getData(CAROUSEL_ID).slides ?? [];
  const setSlides = (next: CarouselSlide[]) => setData(CAROUSEL_ID, { ...getData(CAROUSEL_ID), slides: next });
  const updateSlide = (i: number, changes: Partial<CarouselSlide>) =>
    setSlides(slides.map((s, idx) => idx === i ? { ...s, ...changes } : s));
  const moveSlide = (i: number, delta: number) => {
    const next = [...slides];
    const [item] = next.splice(i, 1);
    next.splice(i + delta, 0, item);
    setSlides(next);
  };

  // ── Settings: any other block with a simple { value } ──
  const settings = contents.filter(c => c.id !== HERO_ID && c.id !== CAROUSEL_ID);

  if (loading) {
    return <p className="text-text-meta text-sm">Cargando contenido…</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-headline-lg text-2xl font-bold text-text-primary">Contenido de la Tienda</h1>
          <p className="text-sm text-text-secondary mt-1">Lo que guardes aquí se muestra en la página de inicio. Los campos vacíos usan el texto por defecto.</p>
        </div>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-2 bg-surface-container rounded-lg hover:bg-gray-200 transition-colors text-sm text-text-secondary font-medium">
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            Ver tienda
          </a>
          <button onClick={fetchContent} className="p-2 bg-surface-container rounded-lg hover:bg-gray-200 transition-colors" title="Recargar">
            <span className="material-symbols-outlined text-text-secondary">refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

        {/* ─── Hero banner ─────────────────────────────── */}
        <section className="bg-white rounded-xl border border-divider p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-divider pb-3">
            <span className="material-symbols-outlined text-belia-red">view_carousel</span>
            <h2 className="font-bold text-lg text-text-primary">Banner principal</h2>
          </div>

          <Field label="Etiqueta superior" help="Texto pequeño sobre el título. Ej: «Envío gratis desde $1,500»">
            <input type="text" value={hero.badge ?? ''} onChange={e => setHero('badge', e.target.value)} className={inputClass} placeholder="Calidad Profesional para Todos" />
          </Field>
          <Field label="Título" help="La última palabra se muestra con el degradado rojo de la marca.">
            <input type="text" value={hero.title ?? ''} onChange={e => setHero('title', e.target.value)} className={inputClass} placeholder="Tu belleza al máximo nivel" />
          </Field>
          <Field label="Subtítulo">
            <textarea rows={3} value={hero.subtitle ?? ''} onChange={e => setHero('subtitle', e.target.value)} className={inputClass} placeholder="Descubre el catálogo definitivo de belleza…" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Texto del botón">
              <input type="text" value={hero.cta_text ?? ''} onChange={e => setHero('cta_text', e.target.value)} className={inputClass} placeholder="Ver todos los productos" />
            </Field>
            <Field label="Enlace del botón" help="Ej: /categoria/capilar o una URL completa">
              <input type="text" value={hero.cta_url ?? ''} onChange={e => setHero('cta_url', e.target.value)} className={inputClass} placeholder="/categoria/todos" />
            </Field>
          </div>
          <Field label="Imagen de fondo" help="Recomendado: horizontal, mínimo 1600 px de ancho.">
            <ImageField value={hero.image_url ?? ''} onChange={url => setHero('image_url', url)} folder="banners" />
          </Field>

          {renderSave(HERO_ID)}
        </section>

        {/* ─── Promo carousel ──────────────────────────── */}
        <section className="bg-white rounded-xl border border-divider p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-divider pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-belia-red">photo_library</span>
              <h2 className="font-bold text-lg text-text-primary">Carrusel de promociones</h2>
            </div>
            <span className="text-xs text-text-meta">{slides.length} {slides.length === 1 ? 'diapositiva' : 'diapositivas'}</span>
          </div>
          <p className="text-xs text-text-secondary">
            Aparece en el inicio debajo de las categorías. Si no hay diapositivas con imagen, la sección no se muestra.
            Recomendado: imágenes horizontales 3:1 (ej. 1800×600 px).
          </p>

          {slides.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-divider rounded-xl text-sm text-text-meta">
              Aún no hay promociones.
            </div>
          )}

          {slides.map((slide, i) => (
            <div key={i} className="border border-divider rounded-xl p-4 space-y-3 bg-surface-bright">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Diapositiva {i + 1}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveSlide(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30" title="Subir">
                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                  </button>
                  <button onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30" title="Bajar">
                    <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                  </button>
                  <button
                    onClick={() => { if (confirm('¿Eliminar esta diapositiva?')) setSlides(slides.filter((_, idx) => idx !== i)); }}
                    className="p-1 rounded text-error hover:bg-error/10"
                    title="Eliminar"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              <Field label="Imagen *">
                <ImageField value={slide.image_url} onChange={url => updateSlide(i, { image_url: url })} folder="carousel" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Título (opcional)">
                  <input type="text" value={slide.title ?? ''} onChange={e => updateSlide(i, { title: e.target.value })} className={inputClass} placeholder="2x1 en tintes" />
                </Field>
                <Field label="Subtítulo (opcional)">
                  <input type="text" value={slide.subtitle ?? ''} onChange={e => updateSlide(i, { subtitle: e.target.value })} className={inputClass} placeholder="Solo esta semana" />
                </Field>
                <Field label="Texto del botón (opcional)">
                  <input type="text" value={slide.cta_text ?? ''} onChange={e => updateSlide(i, { cta_text: e.target.value })} className={inputClass} placeholder="Comprar ahora" />
                </Field>
                <Field label="Enlace" help="Sin título ni botón, toda la imagen es el enlace.">
                  <input type="text" value={slide.cta_url ?? ''} onChange={e => updateSlide(i, { cta_url: e.target.value })} className={inputClass} placeholder="/categoria/capilar-coloracion" />
                </Field>
              </div>
            </div>
          ))}

          <button
            onClick={() => setSlides([...slides, { image_url: '' }])}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-belia-red/40 text-belia-red font-bold py-2.5 rounded-lg hover:bg-belia-red/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Agregar diapositiva
          </button>

          {slides.some(s => !s.image_url) && (
            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
              Las diapositivas sin imagen no se mostrarán en la tienda.
            </p>
          )}

          {renderSave(CAROUSEL_ID)}
        </section>

        {/* ─── General settings ────────────────────────── */}
        {settings.length > 0 && (
          <section className="bg-white rounded-xl border border-divider p-6 shadow-sm space-y-4 xl:col-span-2">
            <div className="flex items-center gap-2 border-b border-divider pb-3">
              <span className="material-symbols-outlined text-belia-red">tune</span>
              <h2 className="font-bold text-lg text-text-primary">Configuración general</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {settings.map(setting => {
                const meta = SETTING_LABELS[setting.id];
                return (
                  <div key={setting.id} className="space-y-3">
                    <Field label={meta?.label ?? setting.id.replace(/_/g, ' ')} help={meta?.help}>
                      <input
                        type="text"
                        value={setting.content_data?.value ?? ''}
                        onChange={e => setData(setting.id, { ...setting.content_data, value: e.target.value })}
                        className={inputClass}
                      />
                    </Field>
                    {renderSave(setting.id, 'Guardar')}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
