import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCartStore } from '../../store/cartStore';
import type { Product } from '../../types/database';

interface ProductCardProps {
  product: Product;
  supplierPrice?: number | null; // Passed EXPLICITLY only if user is an approved supplier
}

/**
 * ProductCard — Displays a product in catalog grids.
 * Handles pricing display logic (Promo vs Regular vs Supplier).
 * NEVER accesses price_proveedor directly from Product type.
 */
export function ProductCard({ product, supplierPrice }: ProductCardProps) {
  const { addToCart } = useCartStore();

  const isOutOfStock = product.stock <= 0;
  
  // Pricing logic
  let displayPrice = product.price_publico;
  let originalPrice: number | null = null;

  if (supplierPrice) {
    // Supplier price wins all, no promo logic applies to suppliers typically
    displayPrice = supplierPrice;
  } else if (product.price_promo) {
    displayPrice = product.price_promo;
    originalPrice = product.price_publico;
  }

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col bg-white rounded-xl border border-divider hover:shadow-lg transition-all overflow-hidden h-full"
    >
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-2">
        {product.featured_label && (
          <span className="bg-belia-red text-white text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">
            {product.featured_label}
          </span>
        )}
        {supplierPrice && (
          <span className="bg-tertiary-container text-white text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">
            Precio Especial
          </span>
        )}
        {originalPrice && !supplierPrice && (
          <span className="bg-surface-variant text-belia-red text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">
            Oferta
          </span>
        )}
        {isOutOfStock && (
          <span className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">
            Agotado
          </span>
        )}
      </div>

      <Link to={`/producto/${product.id}`} className="block relative aspect-square bg-surface-dim overflow-hidden p-4">
        <img 
          src={product.image_url || 'https://placehold.co/400x400?text=Sin+Imagen'} 
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
        />
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <div className="mb-2">
          {product.brand && (
            <span className="text-xs text-text-meta uppercase tracking-wider font-semibold">
              {product.brand}
            </span>
          )}
          <Link to={`/producto/${product.id}`} className="block mt-1">
            <h3 className="font-headline-sm text-sm font-semibold text-text-primary line-clamp-2 group-hover:text-belia-red transition-colors">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between">
          <div>
            {originalPrice && (
              <p className="text-xs text-text-meta line-through">
                {formatPrice(originalPrice)}
              </p>
            )}
            <p className="font-bold text-text-primary text-lg">
              {formatPrice(displayPrice)}
            </p>
          </div>
          <button
            onClick={() => addToCart(product, 1, supplierPrice)}
            disabled={isOutOfStock}
            className={`p-2 rounded-full transition-colors flex items-center justify-center ${
              isOutOfStock 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-surface-container text-belia-red hover:bg-belia-red hover:text-white'
            }`}
            aria-label="Agregar al carrito"
          >
            <span className="material-symbols-outlined text-sm">
              {isOutOfStock ? 'remove_shopping_cart' : 'add_shopping_cart'}
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
