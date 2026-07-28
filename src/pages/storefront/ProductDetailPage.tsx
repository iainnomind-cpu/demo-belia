import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useCartStore } from '../../store/cartStore';
import type { Product, SupplierProduct } from '../../types/database';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

function ProductDetailSkeleton() {
  return (
    <div className="bg-belia-cream min-h-screen">
      <div className="bg-white border-b border-divider py-4">
        <div className="container-belia flex gap-2 items-center">
          <div className="h-3 w-16 bg-surface-container-low rounded-full animate-pulse" />
          <div className="h-3 w-3 bg-surface-container-low rounded-full animate-pulse" />
          <div className="h-3 w-32 bg-surface-container-low rounded-full animate-pulse" />
        </div>
      </div>
      <div className="container-belia py-10">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="aspect-square bg-white rounded-3xl border border-divider animate-pulse" />
          <div className="space-y-5 py-4">
            <div className="h-3 w-20 bg-surface-container-low rounded-full animate-pulse" />
            <div className="h-8 w-3/4 bg-surface-container rounded-xl animate-pulse" />
            <div className="h-8 w-1/2 bg-surface-container rounded-xl animate-pulse" />
            <div className="h-12 w-40 bg-surface-container-high rounded-2xl animate-pulse" />
            <div className="h-14 rounded-full bg-belia-blush animate-pulse mt-4" />
            <div className="space-y-2 pt-4 border-t border-divider">
              <div className="h-4 bg-surface-container-low rounded-full animate-pulse" />
              <div className="h-4 w-5/6 bg-surface-container-low rounded-full animate-pulse" />
              <div className="h-4 w-4/5 bg-surface-container-low rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ProductDetailPage (PDP) — Premium product detail.
 * - Gallery image with zoom effect
 * - Sticky add-to-cart on mobile
 * - Price: promo strikethrough, supplier override, discount badge
 * - Expandable description
 * - NEVER shows price_proveedor except via explicit supplierPrice prop
 */
export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToCart } = useCartStore();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [supplierPrice, setSupplierPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [descOpen, setDescOpen] = useState(true);
  const [imgZoomed, setImgZoomed] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (fetchErr || !data) {
        setError('Producto no encontrado');
        setLoading(false);
        return;
      }
      setProduct(data);

      // Supplier price via secure RPC
      if (user?.role === 'proveedor' || user?.role === 'admin') {
        const { data: spData } = await supabase.rpc('get_supplier_products');
        const sp = (spData as SupplierProduct[] | null)?.find(p => p.id === id);
        if (sp?.price_proveedor) setSupplierPrice(sp.price_proveedor);
      }

      setLoading(false);
    }
    void fetchProduct();
  }, [id, user]);

  if (loading) return <ProductDetailSkeleton />;

  if (error || !product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <span className="text-6xl mb-4" role="img" aria-label="Not found">😕</span>
        <h2 className="text-2xl font-bold text-belia-charcoal mb-2">Producto no encontrado</h2>
        <p className="text-text-secondary text-sm mb-6">Este producto ya no está disponible o el link es incorrecto.</p>
        <button onClick={() => navigate(-1)} className="btn-primary">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Regresar
        </button>
      </div>
    );
  }

  // Pricing
  const isOutOfStock = product.stock <= 0;
  let displayPrice = product.price_publico;
  let originalPrice: number | null = null;

  if (supplierPrice) {
    displayPrice = supplierPrice;
  } else if (product.price_promo) {
    displayPrice = product.price_promo;
    originalPrice = product.price_publico;
  }

  const discountPct =
    originalPrice && originalPrice > 0
      ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
      : null;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity, supplierPrice);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  return (
    <div className="bg-belia-cream min-h-screen pb-28 md:pb-0">

      {/* ─── Breadcrumb ───────────────────────────────────── */}
      <div className="bg-white border-b border-divider">
        <nav className="container-belia py-3.5 flex items-center gap-1.5 text-[12px] text-text-meta" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-belia-red transition-colors">Inicio</Link>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <Link to="/categoria/todos" className="hover:text-belia-red transition-colors">Catálogo</Link>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <span className="text-text-secondary font-medium line-clamp-1 max-w-[200px]">{product.name}</span>
        </nav>
      </div>

      {/* ─── Main grid ───────────────────────────────────── */}
      <div className="container-belia py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* ─── LEFT: Product Image ──────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
            className="md:sticky md:top-24"
          >
            {/* Main image */}
            <div
              className={`relative rounded-3xl overflow-hidden border border-divider bg-white cursor-zoom-in transition-all duration-350 ${imgZoomed ? 'ring-2 ring-belia-coral' : ''}`}
              style={{ aspectRatio: '1 / 1' }}
              onClick={() => setImgZoomed(!imgZoomed)}
            >
              {/* Badges */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                {product.featured_label && (
                  <span className="product-badge">{product.featured_label}</span>
                )}
                {discountPct && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-belia-pink text-white shadow-belia-sm">
                    -{discountPct}%
                  </span>
                )}
                {supplierPrice && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-tertiary text-white">
                    Precio especial
                  </span>
                )}
              </div>

              {/* Out of stock overlay */}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-10">
                  <span className="bg-belia-charcoal text-white font-bold px-8 py-3 rounded-full text-lg shadow-belia-lg uppercase tracking-wider -rotate-12 inline-block">
                    Agotado
                  </span>
                </div>
              )}

              <img
                src={product.image_url ?? `https://placehold.co/600x600/FFF0F3/F6423C?text=${encodeURIComponent(product.name.slice(0, 15))}`}
                alt={product.name}
                className={`w-full h-full object-contain p-8 mix-blend-multiply transition-transform duration-600 ${imgZoomed ? 'scale-110' : 'scale-100'}`}
              />

              {/* Zoom hint */}
              <div className="absolute bottom-3 right-3 opacity-60">
                <span className="material-symbols-outlined text-[18px] text-text-meta">
                  {imgZoomed ? 'zoom_out' : 'zoom_in'}
                </span>
              </div>
            </div>

            {/* SKU + source badge */}
            <div className="flex items-center justify-between mt-3 px-1">
              <span className="text-[11px] text-text-meta font-medium">SKU: {product.sku}</span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                product.source === 'manual'
                  ? 'border-tertiary/30 bg-tertiary/10 text-tertiary'
                  : 'border-belia-coral/30 bg-belia-blush text-belia-red'
              }`}>
                <span className="material-symbols-outlined text-[11px]">
                  {product.source === 'manual' ? 'edit_note' : 'sync'}
                </span>
                {product.source === 'manual' ? 'Ingreso manual' : 'Catálogo Belia'}
              </span>
            </div>
          </motion.div>

          {/* ─── RIGHT: Product Info ──────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
            className="flex flex-col"
          >
            {/* Brand */}
            {product.brand && (
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-belia-gray mb-2">
                {product.brand}
              </span>
            )}

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-belia-charcoal leading-tight mb-4">
              {product.name}
            </h1>

            {/* Price block */}
            <div className="flex items-end gap-3 mb-2">
              <span className={`text-3xl md:text-4xl font-bold ${originalPrice ? 'text-belia-red' : 'text-belia-charcoal'}`}>
                {formatPrice(displayPrice)}
              </span>
              {originalPrice && (
                <span className="text-lg text-text-meta line-through mb-1">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>

            {/* Shipping note */}
            <p className="text-xs text-success-green font-semibold flex items-center gap-1 mb-6">
              <span className="material-symbols-outlined text-[14px]">local_shipping</span>
              Envío calculado al finalizar compra
            </p>

            {/* Availability */}
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-6 text-sm font-semibold ${
              isOutOfStock
                ? 'bg-error/10 text-error border border-error/20'
                : 'bg-success-green/10 text-success-green border border-success-green/20'
            }`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOutOfStock ? 'bg-error' : 'bg-success-green'}`} />
              {isOutOfStock
                ? 'Sin stock — disponible pronto'
                : `En stock · ${product.stock} unidades`}
            </div>

            {/* Quantity + CTA */}
            <div className="flex items-center gap-3 mb-4">
              {/* Qty selector */}
              <div className="flex items-center rounded-full border border-divider bg-white overflow-hidden flex-shrink-0">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={isOutOfStock || quantity <= 1}
                  className="w-10 h-12 flex items-center justify-center text-xl text-text-secondary hover:text-belia-red disabled:opacity-30 transition-colors"
                  aria-label="Disminuir cantidad"
                >
                  –
                </button>
                <span className="w-10 h-12 flex items-center justify-center text-sm font-bold text-belia-charcoal border-x border-divider">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  disabled={isOutOfStock || quantity >= product.stock}
                  className="w-10 h-12 flex items-center justify-center text-xl text-text-secondary hover:text-belia-red disabled:opacity-30 transition-colors"
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
              </div>

              {/* Add to cart */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-belia-sm ${
                  isOutOfStock
                    ? 'bg-surface-container text-text-meta cursor-not-allowed'
                    : added
                      ? 'bg-success-green text-white shadow-belia-md'
                      : 'bg-belia-red text-white hover:bg-belia-coral hover:shadow-belia-md'
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={added ? 'added' : 'add'}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isOutOfStock ? 'block' : added ? 'check_circle' : 'shopping_bag'}
                    </span>
                    {isOutOfStock ? 'Sin stock' : added ? '¡Agregado!' : 'Agregar al carrito'}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </div>

            {/* ─── Description (expandable) ─────────────── */}
            {product.description && (
              <div className="border-t border-divider pt-6 mt-2">
                <button
                  onClick={() => setDescOpen(!descOpen)}
                  className="flex items-center justify-between w-full text-left mb-3 group"
                >
                  <span className="text-sm font-bold text-belia-charcoal group-hover:text-belia-red transition-colors">
                    Descripción del producto
                  </span>
                  <motion.span
                    animate={{ rotate: descOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="material-symbols-outlined text-[18px] text-text-meta"
                  >
                    expand_more
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {descOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                        {product.description}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Tinte / asesoría callout */}
            <div className="mt-6 rounded-2xl bg-belia-blush border border-belia-pink/25 p-4 flex items-start gap-3">
              <span className="text-2xl mt-0.5" role="img" aria-label="Asesoría">💬</span>
              <div>
                <p className="text-sm font-bold text-belia-charcoal">¿Tienes dudas sobre este producto?</p>
                <p className="text-xs text-text-secondary mt-0.5">Nuestros asesores te ayudan a elegir el tono o tratamiento ideal.</p>
                <a
                  href="https://wa.me/521XXXXXXXXXX"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-belia-red hover:text-belia-coral transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">chat</span>
                  Preguntar por WhatsApp
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── Mobile sticky CTA bar ───────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-white/95 backdrop-blur-md border-t border-divider px-4 py-3 flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex-1">
          <p className="text-[11px] text-text-meta leading-none mb-0.5 line-clamp-1">{product.name}</p>
          <p className="text-base font-bold text-belia-red leading-none">{formatPrice(displayPrice)}</p>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm flex-shrink-0 transition-all duration-250 ${
            isOutOfStock
              ? 'bg-surface-container text-text-meta cursor-not-allowed'
              : added
                ? 'bg-success-green text-white'
                : 'bg-belia-red text-white hover:bg-belia-coral'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {added ? 'check' : 'shopping_bag'}
          </span>
          {added ? '¡Listo!' : 'Al carrito'}
        </button>
      </div>
    </div>
  );
}
