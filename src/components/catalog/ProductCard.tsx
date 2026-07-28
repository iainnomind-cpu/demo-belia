import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../../store/cartStore';
import type { Product } from '../../types/database';

interface ProductCardProps {
  product: Product;
  supplierPrice?: number | null; // Passed EXPLICITLY only if user is an approved supplier
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

/**
 * ProductCard — Premium Double-Bezel product card.
 * - Hover: image scale + soft shadow lift
 * - Quick add to cart with spring feedback
 * - Pricing: promo price with strikethrough, supplier price override
 * - NEVER accesses price_proveedor directly from Product type
 */
export function ProductCard({ product, supplierPrice }: ProductCardProps) {
  const { addToCart } = useCartStore();
  const [added, setAdded] = useState(false);

  const isOutOfStock = product.stock <= 0;

  // Pricing logic
  let displayPrice = product.price_publico;
  let originalPrice: number | null = null;
  const hasDiscount = !!originalPrice;

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
    addToCart(product, 1, supplierPrice);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
      className="group relative flex flex-col bg-white rounded-2xl border border-divider overflow-hidden h-full transition-all duration-350 hover:shadow-card-hover hover:-translate-y-1"
      style={{ willChange: 'transform' }}
    >
      {/* ─── Image area ─────────────────────────────── */}
      <Link
        to={`/producto/${product.id}`}
        className="block relative bg-belia-cream overflow-hidden"
        style={{ aspectRatio: '1 / 1' }}
      >
        <img
          src={product.image_url || `https://placehold.co/400x400/FFF0F3/F6423C?text=${encodeURIComponent(product.name.slice(0, 10))}`}
          alt={product.name}
          className="w-full h-full object-contain p-4 transition-transform duration-600 group-hover:scale-[1.06] mix-blend-multiply"
          style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
          loading="lazy"
        />

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/8 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-350" />

        {/* Quick View pill on hover */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 pointer-events-none">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/95 text-[11px] font-bold text-belia-charcoal shadow-belia-sm whitespace-nowrap">
            <span className="material-symbols-outlined text-[13px]">visibility</span>
            Vista rápida
          </span>
        </div>
      </Link>

      {/* ─── Badges (top-left stack) ─────────────────── */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5">
        {product.featured_label && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-belia-red text-white shadow-belia-sm">
            {product.featured_label}
          </span>
        )}
        {discountPct && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-belia-pink text-white shadow-belia-sm">
            -{discountPct}%
          </span>
        )}
        {supplierPrice && !hasDiscount && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-tertiary text-white">
            Precio especial
          </span>
        )}
        {isOutOfStock && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-belia-charcoal text-white">
            Agotado
          </span>
        )}
      </div>

      {/* ─── Content area ────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4">
        {/* Brand */}
        {product.brand && (
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-belia-gray mb-1 block">
            {product.brand}
          </span>
        )}

        {/* Name */}
        <Link to={`/producto/${product.id}`} className="block flex-1 mb-3">
          <h3 className="text-sm font-semibold text-belia-charcoal leading-snug line-clamp-2 group-hover:text-belia-red transition-colors duration-200">
            {product.name}
          </h3>
        </Link>

        {/* Price + Add to cart */}
        <div className="flex items-end justify-between gap-2 mt-auto">
          <div className="flex flex-col">
            {originalPrice && (
              <span className="text-[11px] text-text-meta line-through leading-none mb-0.5">
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className={`font-bold leading-none ${originalPrice ? 'text-belia-red text-base' : 'text-belia-charcoal text-base'}`}>
              {formatPrice(displayPrice)}
            </span>
          </div>

          {/* Add to cart button — spring feedback */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            aria-label={isOutOfStock ? 'Sin stock' : 'Agregar al carrito'}
            className={`relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-250 ${
              isOutOfStock
                ? 'bg-divider text-text-meta cursor-not-allowed'
                : added
                  ? 'bg-success-green text-white shadow-belia-sm'
                  : 'bg-belia-blush text-belia-red hover:bg-belia-red hover:text-white shadow-belia-sm hover:shadow-belia-md'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={added ? 'check' : 'cart'}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="material-symbols-outlined text-[17px]"
              >
                {isOutOfStock ? 'block' : added ? 'check' : 'add_shopping_cart'}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
