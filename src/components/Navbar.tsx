import { motion } from 'framer-motion';
import { useCartStore } from '../store/cartStore';

export function Navbar() {
  const { items, setIsCartOpen } = useCartStore();
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <motion.header 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white sticky top-0 z-50 border-b border-divider"
    >
      <div className="flex justify-between items-center w-full px-margin py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-gutter flex-1">
          <div className="hidden md:flex items-center bg-gray-50 border border-divider rounded-full px-4 py-2 w-64 focus-within:border-belia-red focus-within:ring-1 focus-within:ring-belia-red transition-colors">
            <span className="material-symbols-outlined text-text-secondary mr-2">search</span>
            <input className="bg-transparent border-none focus:ring-0 p-0 w-full text-sm placeholder-text-meta outline-none" placeholder="Buscar productos o marcas..." type="text"/>
          </div>
          <button className="md:hidden p-2 text-text-primary">
            <span className="material-symbols-outlined">search</span>
          </button>
        </div>
        <div className="flex-shrink-0 flex justify-center flex-1">
          <a className="font-headline-md text-3xl font-bold text-belia-red tracking-tight" href="#">Belia</a>
        </div>
        <nav className="hidden lg:flex items-center justify-center gap-6 flex-1">
          <a className="font-label-md text-sm text-belia-red font-bold border-b-2 border-belia-red pb-1" href="#">Tienda</a>
          <a className="font-label-md text-sm text-text-secondary hover:text-belia-red transition-colors" href="#">Mayoreo</a>
          <a className="font-label-md text-sm text-text-secondary hover:text-belia-red transition-colors" href="#">Marcas</a>
        </nav>
        <div className="flex items-center justify-end gap-element-gap flex-1">
          <a className="hidden md:inline-flex text-sm text-text-secondary hover:text-belia-red transition-colors" href="#">Acceso Estilistas</a>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCartOpen(true)}
            className="p-2 text-text-primary hover:text-belia-red transition-colors relative"
          >
            <span className="material-symbols-outlined">shopping_cart</span>
            {cartItemCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                key={cartItemCount}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
                className="absolute top-0 right-0 bg-belia-red text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center"
              >
                {cartItemCount}
              </motion.span>
            )}
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}
