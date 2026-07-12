import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';

export function CartSidebar() {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeFromCart } = useCartStore();
  const navigate = useNavigate();

  const total = items.reduce((sum, item) => {
    const price = item.price_proveedor || item.price_promo || item.price_publico;
    return sum + (price * item.quantity);
  }, 0);

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="p-4 border-b border-divider flex items-center justify-between">
              <h2 className="font-headline-sm font-bold text-xl text-text-primary">Tu Carrito</h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-text-secondary hover:text-belia-red transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-meta">
                  <span className="material-symbols-outlined text-5xl mb-4 opacity-50">shopping_bag</span>
                  <p>Tu carrito está vacío</p>
                </div>
              ) : (
                items.map(item => {
                  const currentPrice = item.price_proveedor || item.price_promo || item.price_publico;
                  return (
                    <div key={item.product_id} className="flex gap-4 border-b border-divider pb-4">
                      <div className="w-20 h-20 bg-surface-dim rounded flex-shrink-0 p-2">
                        <img 
                          src={item.image_url || 'https://placehold.co/200x200?text=IMG'} 
                          alt={item.name} 
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <h4 className="text-sm font-semibold text-text-primary line-clamp-2">{item.name}</h4>
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <p className="font-bold text-belia-red">{formatPrice(currentPrice)}</p>
                          <div className="flex items-center gap-3 bg-surface-container rounded-full px-2 py-1">
                            <button 
                              onClick={() => updateQuantity(item.product_id, -1)}
                              className="text-text-secondary hover:text-belia-red disabled:opacity-50"
                              disabled={item.quantity <= 1}
                            >
                              <span className="material-symbols-outlined text-sm">remove</span>
                            </button>
                            <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.product_id, 1)}
                              className="text-text-secondary hover:text-belia-red disabled:opacity-50"
                              disabled={item.quantity >= item.stock}
                            >
                              <span className="material-symbols-outlined text-sm">add</span>
                            </button>
                          </div>
                        </div>
                        {item.price_proveedor && (
                          <span className="text-[10px] text-success-green font-semibold mt-1">Precio Especial B2B</span>
                        )}
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-text-meta hover:text-error self-start p-1"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-divider p-6 bg-surface-bright">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-text-secondary font-medium">Subtotal</span>
                  <span className="font-headline-sm font-bold text-xl text-text-primary">
                    {formatPrice(total)}
                  </span>
                </div>
                <button 
                  onClick={handleCheckout}
                  className="w-full bg-belia-red text-white py-3 rounded-xl font-bold hover:bg-belia-red-deep transition-colors shadow-md"
                >
                  Ir al Checkout
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
