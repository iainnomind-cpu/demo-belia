import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';

type SidebarView = 'cart' | 'checkout';

export function CartSidebar() {
  const { 
    isCartOpen, setIsCartOpen, items, updateQuantity, removeFromCart, 
    clearCart, checkoutSuccess, setCheckoutSuccess 
  } = useCartStore();

  const addOrder = useOrderStore(state => state.addOrder);

  const [view, setView] = useState<SidebarView>('cart');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = subtotal >= 3000 ? 0 : 150;
  const total = subtotal > 0 ? subtotal + shippingCost : 0;

  const handleClose = () => {
    setIsCartOpen(false);
    setTimeout(() => setView('cart'), 300);
  };

  const handleSubmitOrder = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const orderData = {
      customer: {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
      },
      shipping: {
        address: formData.get('address') as string,
        colony: formData.get('colony') as string,
        zip: formData.get('zip') as string,
        city: formData.get('city') as string,
      },
      items: [...items],
      subtotal,
      shippingCost,
      total
    };

    setTimeout(() => {
      addOrder(orderData);
      setIsSubmitting(false);
      clearCart();
      setCheckoutSuccess(true);
      setTimeout(() => {
        setCheckoutSuccess(false);
        handleClose();
      }, 3000);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="fixed inset-0 bg-black/50 z-[60]" />
          
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col">
            <div className="p-6 border-b border-divider flex justify-between items-center bg-gray-50">
              <h2 className="font-headline-md text-xl font-bold flex items-center gap-2">
                {view === 'checkout' && !checkoutSuccess ? (
                  <button onClick={() => setView('cart')} className="hover:text-belia-red transition-colors flex items-center">
                    <span className="material-symbols-outlined mr-2">arrow_back</span> Checkout
                  </button>
                ) : (
                  <><span className="material-symbols-outlined text-belia-red">shopping_cart</span> Tu Carrito</>
                )}
              </h2>
              <button onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 relative overflow-x-hidden">
              <AnimatePresence mode="wait">
                {checkoutSuccess ? (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="w-20 h-20 bg-success-green/10 text-success-green rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-5xl">check_circle</span></div>
                    <h3 className="text-2xl font-bold">¡Compra Exitosa!</h3>
                    <p className="text-text-secondary">Tu pedido ha sido procesado correctamente y enviaremos los detalles a tu correo.</p>
                  </motion.div>
                ) : items.length === 0 ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-center text-text-secondary">
                    <span className="material-symbols-outlined text-6xl mb-4 opacity-20">production_quantity_limits</span>
                    <p>Tu carrito está vacío</p>
                    <button onClick={handleClose} className="mt-4 text-belia-red font-bold hover:underline">Seguir Comprando</button>
                  </motion.div>
                ) : view === 'cart' ? (
                  <motion.div key="cart-items" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="flex flex-col gap-6">
                    {items.map(item => (
                      <div key={item.id} className="flex gap-4 border-b border-divider pb-4">
                        <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-md bg-gray-100" />
                        <div className="flex-1 flex flex-col justify-between">
                          <div><h4 className="text-sm font-medium line-clamp-2">{item.name}</h4><p className="text-xs text-text-meta mt-1">{item.brand}</p></div>
                          <div className="flex justify-between items-center mt-2">
                            <div className="flex items-center border border-divider rounded-md overflow-hidden bg-gray-50">
                              <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-1 hover:bg-gray-200"><span className="material-symbols-outlined text-sm">remove</span></button>
                              <span className="px-3 text-sm font-medium">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-1 hover:bg-gray-200"><span className="material-symbols-outlined text-sm">add</span></button>
                            </div>
                            <span className="font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="self-start text-text-meta hover:text-belia-red transition-colors"><span className="material-symbols-outlined">delete</span></button>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.form id="checkout-form" onSubmit={handleSubmitOrder} key="checkout-form" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} className="flex flex-col gap-4">
                    <div>
                      <h3 className="font-bold text-lg mb-4">Datos de Contacto</h3>
                      <div className="space-y-3">
                        <input name="name" type="text" required placeholder="Nombre Completo" className="w-full border border-divider rounded-md px-3 py-2 text-sm focus:outline-none focus:border-belia-red focus:ring-1 focus:ring-belia-red" />
                        <input name="email" type="email" required placeholder="Correo Electrónico" className="w-full border border-divider rounded-md px-3 py-2 text-sm focus:outline-none focus:border-belia-red focus:ring-1 focus:ring-belia-red" />
                        <input name="phone" type="tel" required placeholder="Teléfono" className="w-full border border-divider rounded-md px-3 py-2 text-sm focus:outline-none focus:border-belia-red focus:ring-1 focus:ring-belia-red" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="font-bold text-lg mb-4">Dirección de Envío</h3>
                      <div className="space-y-3">
                        <input name="address" type="text" required placeholder="Calle y Número" className="w-full border border-divider rounded-md px-3 py-2 text-sm focus:outline-none focus:border-belia-red focus:ring-1 focus:ring-belia-red" />
                        <div className="grid grid-cols-2 gap-3">
                          <input name="colony" type="text" required placeholder="Colonia" className="w-full border border-divider rounded-md px-3 py-2 text-sm focus:outline-none focus:border-belia-red focus:ring-1 focus:ring-belia-red" />
                          <input name="zip" type="text" required placeholder="Código Postal" className="w-full border border-divider rounded-md px-3 py-2 text-sm focus:outline-none focus:border-belia-red focus:ring-1 focus:ring-belia-red" />
                        </div>
                        <input name="city" type="text" required placeholder="Ciudad, Estado" className="w-full border border-divider rounded-md px-3 py-2 text-sm focus:outline-none focus:border-belia-red focus:ring-1 focus:ring-belia-red" />
                      </div>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {!checkoutSuccess && items.length > 0 && (
              <div className="p-6 border-t border-divider bg-gray-50 space-y-4">
                {view === 'cart' ? (
                  <>
                    <div className="flex justify-between text-sm"><span className="text-text-secondary">Subtotal</span><span className="font-medium">${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-text-secondary">Envío</span><span className="font-medium">{shippingCost === 0 ? <span className="text-success-green font-bold">Gratis</span> : `$${shippingCost.toFixed(2)}`}</span></div>
                    <div className="border-t border-divider pt-4 flex justify-between items-center"><span className="font-bold text-lg">Total</span><span className="font-bold text-2xl text-belia-red">${total.toFixed(2)}</span></div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setView('checkout')} className="w-full bg-belia-red text-white font-bold py-4 rounded-xl hover:bg-belia-red-deep transition-colors shadow-lg mt-4 text-lg">Continuar con el Pago</motion.button>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center border-b border-divider pb-4 mb-2"><span className="font-bold text-lg">Total a Pagar</span><span className="font-bold text-2xl text-belia-red">${total.toFixed(2)}</span></div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" form="checkout-form" disabled={isSubmitting} className={`w-full flex items-center justify-center font-bold py-4 rounded-xl shadow-lg mt-4 text-lg transition-colors ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-belia-red text-white hover:bg-belia-red-deep'}`}>
                      {isSubmitting ? <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span> : <span className="material-symbols-outlined mr-2">lock</span>}
                      {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
                    </motion.button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
