import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { Product } from '../data/products';
import { useCartStore } from '../store/cartStore';

interface ProductCardProps {
  product: Product;
  variants?: Variants;
}

export function ProductCard({ product, variants }: ProductCardProps) {
  const addToCart = useCartStore((state) => state.addToCart);

  return (
    <motion.div 
      variants={variants}
      whileHover={{ y: -6, boxShadow: "0px 15px 35px rgba(238, 64, 54, 0.12)" }}
      className="group flex flex-col bg-white rounded-xl p-3 border border-divider relative transition-shadow"
    >
        {product.badge && (
          <div className="absolute top-4 left-4 z-10">
              <span className="bg-success-green text-white text-[10px] font-bold px-2 py-0.5 rounded">{product.badge}</span>
          </div>
        )}
        <div className="relative w-full aspect-square mb-3 bg-gray-50 overflow-hidden rounded-lg">
            <motion.img 
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.4 }}
              alt={product.name} 
              className="w-full h-full object-cover object-center" 
              src={product.image}
            />
        </div>
        <div className="flex-1 flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-text-meta font-bold">{product.brand}</span>
            <h3 className="text-sm text-text-primary font-medium mt-0.5 mb-2 line-clamp-2">{product.name}</h3>
            <div className="mt-auto">
                <span className="text-lg font-bold text-text-primary">${product.price.toFixed(2)}</span>
            </div>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => addToCart(product)}
          className="w-full mt-3 bg-belia-red text-white text-xs font-bold py-3 rounded-lg hover:bg-belia-red-deep transition-colors shadow-sm"
        >
            Añadir al Carrito
        </motion.button>
    </motion.div>
  );
}
