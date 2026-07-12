import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useCartStore } from '../../store/cartStore';
import type { Product, SupplierProduct } from '../../types/database';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToCart } = useCartStore();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [supplierPrice, setSupplierPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;
      setLoading(true);

      // Fetch public product info
      const { data, error: fetchErr } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (fetchErr) {
        setError('Producto no encontrado');
        setLoading(false);
        return;
      }
      
      setProduct(data);

      // If user is supplier, fetch secure price via RPC
      if (user?.role === 'proveedor' || user?.role === 'admin') {
        const { data: spData } = await supabase.rpc('get_supplier_products');
        const sp = (spData as SupplierProduct[] | null)?.find(p => p.id === id);
        if (sp && sp.price_proveedor) {
          setSupplierPrice(sp.price_proveedor);
        }
      }

      setLoading(false);
    }

    void fetchProduct();
  }, [id, user]);

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center"><div className="animate-spin h-10 w-10 border-t-4 border-belia-red rounded-full"></div></div>;
  }

  if (error || !product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Producto no encontrado</h2>
        <Link to="/" className="text-belia-red font-bold hover:underline">Volver a inicio</Link>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;
  let displayPrice = product.price_publico;
  let originalPrice: number | null = null;

  if (supplierPrice) {
    displayPrice = supplierPrice;
  } else if (product.price_promo) {
    displayPrice = product.price_promo;
    originalPrice = product.price_publico;
  }

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Breadcrumb - 3 Clicks Rule validator */}
      <div className="border-b border-divider py-3">
        <div className="max-w-7xl mx-auto px-margin text-sm text-text-secondary flex items-center gap-2">
          <Link to="/" className="hover:text-belia-red">Inicio</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          {product.category_id && <span className="hover:text-belia-red cursor-pointer">Categoría</span>}
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-text-primary font-medium line-clamp-1">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-margin py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-10 lg:gap-16">
          
          {/* Product Image */}
          <div className="flex-1">
            <div className="aspect-square bg-surface-dim rounded-2xl p-8 relative overflow-hidden flex items-center justify-center">
              {product.featured_label && (
                <span className="absolute top-4 left-4 bg-belia-red text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider z-10">
                  {product.featured_label}
                </span>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                  <span className="bg-gray-800 text-white font-bold px-6 py-2 rounded-full text-lg shadow-xl uppercase tracking-wider transform -rotate-12">
                    Agotado
                  </span>
                </div>
              )}
              <img 
                src={product.image_url || 'https://placehold.co/600x600?text=Sin+Imagen'} 
                alt={product.name} 
                className="w-full h-full object-contain mix-blend-multiply"
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="flex-1 flex flex-col">
            {product.brand && (
              <span className="text-sm text-text-meta uppercase tracking-wider font-semibold mb-2">
                {product.brand}
              </span>
            )}
            <h1 className="font-headline-lg text-3xl md:text-4xl font-bold text-text-primary mb-4 leading-tight">
              {product.name}
            </h1>
            
            <p className="text-sm text-text-secondary mb-6">SKU: {product.sku}</p>

            <div className="mb-8">
              {originalPrice && !supplierPrice && (
                <p className="text-text-meta line-through text-lg">
                  {formatPrice(originalPrice)}
                </p>
              )}
              <div className="flex items-end gap-3">
                <p className="font-bold text-text-primary text-3xl md:text-4xl">
                  {formatPrice(displayPrice)}
                </p>
                {supplierPrice && (
                  <span className="bg-tertiary-container text-white text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider mb-2">
                    Precio Proveedor
                  </span>
                )}
              </div>
              <p className="text-sm text-success-green mt-2 font-medium">Envío calculado en el checkout</p>
            </div>

            <div className="bg-surface-bright border border-divider rounded-xl p-6 mb-8">
              <h3 className="font-headline-sm font-bold text-text-primary mb-2">Disponibilidad</h3>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isOutOfStock ? 'bg-error' : 'bg-success-green'}`}></span>
                <span className="text-text-secondary font-medium">
                  {isOutOfStock ? 'Sin stock' : `${product.stock} unidades en almacén`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-auto mb-8">
              <div className="flex items-center bg-white border border-divider rounded-lg h-12">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 text-text-secondary hover:text-belia-red h-full"
                  disabled={isOutOfStock || quantity <= 1}
                >
                  -
                </button>
                <span className="w-10 text-center font-bold text-text-primary">{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-4 text-text-secondary hover:text-belia-red h-full"
                  disabled={isOutOfStock || quantity >= product.stock}
                >
                  +
                </button>
              </div>
              
              <button
                onClick={() => addToCart(product, quantity, supplierPrice)}
                disabled={isOutOfStock}
                className={`flex-1 h-12 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${
                  isOutOfStock 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-belia-red text-white hover:bg-belia-red-deep shadow-md'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isOutOfStock ? 'remove_shopping_cart' : 'shopping_bag'}
                </span>
                {isOutOfStock ? 'Agotado' : 'Agregar al carrito'}
              </button>
            </div>

            {product.description && (
              <div className="border-t border-divider pt-8 mt-4">
                <h3 className="font-headline-sm font-bold text-text-primary mb-4">Descripción del producto</h3>
                <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
