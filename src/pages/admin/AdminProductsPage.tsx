import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types/database';

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  const toggleActive = async (id: string, current: boolean) => {
    const updated = !current;
    setProducts(products.map(p => p.id === id ? { ...p, is_active: updated } : p));
    await supabase.from('products').update({ is_active: updated }).eq('id', id);
  };

  const updateFeatured = async (id: string, label: string | null) => {
    setProducts(products.map(p => p.id === id ? { ...p, featured_label: label } : p));
    await supabase.from('products').update({ featured_label: label }).eq('id', id);
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
          <button className="flex items-center gap-2 bg-belia-red text-white px-4 py-2 rounded-lg font-bold hover:bg-belia-red-deep transition-colors">
            <span className="material-symbols-outlined text-sm">add</span>
            Nuevo (Manual)
          </button>
        </div>
      </div>

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
                      {product.price_proveedor && (
                        <div className="text-success-green font-medium mt-1 text-xs">{formatPrice(product.price_proveedor)} <span className="text-text-meta">B2B</span></div>
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
