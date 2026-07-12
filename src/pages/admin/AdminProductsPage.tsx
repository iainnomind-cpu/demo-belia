import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/database';

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', sku: '', brand: '', price_publico: '', stock: '', category_id: '', image_url: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    void fetchProducts();
    const fetchCats = async () => {
      const { data } = await supabase.from('categories').select('id, name');
      if (data) setCategories(data);
    };
    void fetchCats();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = {
      name: newProduct.name,
      sku: newProduct.sku,
      brand: newProduct.brand,
      price_publico: Number(newProduct.price_publico),
      stock: Number(newProduct.stock),
      category_id: newProduct.category_id || null,
      image_url: newProduct.image_url,
      source: 'manual'
    };

    const { error } = await (supabase.from('products') as any).insert([payload]);
    
    if (!error) {
      setShowModal(false);
      setNewProduct({ name: '', sku: '', brand: '', price_publico: '', stock: '', category_id: '', image_url: '' });
      void fetchProducts();
    } else {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const updated = !current;
    setProducts(products.map(p => p.id === id ? { ...p, is_active: updated } : p));
    await (supabase.from('products') as any).update({ is_active: updated }).eq('id', id);
  };

  const updateFeatured = async (id: string, label: string | null) => {
    setProducts(products.map(p => p.id === id ? { ...p, featured_label: label } : p));
    await (supabase.from('products') as any).update({ featured_label: label }).eq('id', id);
  };

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-headline-lg text-2xl font-bold text-text-primary">Gestión de Productos</h1>
        <div className="flex gap-2">
          <button onClick={fetchProducts} className="p-2 bg-surface-container rounded-lg hover:bg-gray-200 transition-colors" title="Actualizar">
            <span className="material-symbols-outlined text-text-secondary">refresh</span>
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-belia-red text-white px-4 py-2 rounded-lg font-bold hover:bg-belia-red-deep transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Nuevo (Manual)
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-surface-bright">
              <h2 className="font-bold text-lg text-text-primary">Crear Producto Manual</h2>
              <button onClick={() => setShowModal(false)} className="text-text-secondary hover:text-belia-red">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Nombre del Producto *</label>
                <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">SKU *</label>
                  <input required type="text" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Marca *</label>
                  <input required type="text" value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Precio Público (MXN) *</label>
                  <input required type="number" min="0" step="0.01" value={newProduct.price_publico} onChange={e => setNewProduct({...newProduct, price_publico: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Stock Inicial *</label>
                  <input required type="number" min="0" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Categoría</label>
                <select value={newProduct.category_id} onChange={e => setNewProduct({...newProduct, category_id: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm">
                  <option value="">Seleccione una categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">URL de Imagen</label>
                <input type="url" placeholder="https://..." value={newProduct.image_url} onChange={e => setNewProduct({...newProduct, image_url: e.target.value})} className="w-full border-gray-300 rounded-lg text-sm" />
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-divider mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-belia-red text-white text-sm font-bold rounded-lg hover:bg-belia-red-deep disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-divider overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-text-secondary font-medium border-b border-divider uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">SKU / Marca</th>
                <th className="px-6 py-4">Precios</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Estado / Origen</th>
                <th className="px-6 py-4">Etiqueta Destacado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-text-meta">Cargando productos...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-text-meta">No hay productos.</td></tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={product.image_url || ''} alt="" className="w-10 h-10 rounded bg-surface-dim object-contain border border-divider" />
                        <span className="font-medium text-text-primary line-clamp-2 max-w-[200px]">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-mono text-text-secondary">{product.sku}</div>
                      <div className="text-xs uppercase tracking-wider mt-1">{product.brand}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-text-primary">{formatPrice(product.price_publico)} <span className="text-xs font-normal text-text-meta">Púb</span></div>
                      {(product as any).price_proveedor && (
                        <div className="text-success-green font-medium mt-1 text-xs">{formatPrice((product as any).price_proveedor)} <span className="text-text-meta">B2B</span></div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${product.stock > 10 ? 'bg-success-container text-success-green' : product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-error/10 text-error'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <button 
                          onClick={() => toggleActive(product.id, product.is_active)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${product.is_active ? 'bg-success-green' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${product.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                        <span className="text-xs text-text-secondary">{product.is_active ? 'Activo' : 'Inactivo'}</span>
                      </div>
                      <span className="bg-surface-variant text-text-meta text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        {product.source}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={product.featured_label || ''}
                        onChange={(e) => updateFeatured(product.id, e.target.value || null)}
                        className="text-xs border-gray-300 rounded-md focus:ring-belia-red focus:border-belia-red py-1"
                      >
                        <option value="">Ninguna</option>
                        <option value="TOP 1">TOP 1</option>
                        <option value="TOP 2">TOP 2</option>
                        <option value="NUEVO">NUEVO</option>
                        <option value="OFERTA">OFERTA</option>
                      </select>
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
