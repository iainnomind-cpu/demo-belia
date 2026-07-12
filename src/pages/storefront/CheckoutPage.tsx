import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCartStore } from '../../store/cartStore';

export function CheckoutPage() {
  const { user, loading } = useAuth();
  const { items, clearCart, setCheckoutSuccess } = useCartStore();
  const navigate = useNavigate();

  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'MX' // Default as per requirements
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FR-009: Auth is required for checkout
  if (loading) {
    return <div className="min-h-screen flex justify-center items-center"><div className="animate-spin h-10 w-10 border-t-4 border-belia-red rounded-full"></div></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: '/checkout' }} />;
  }

  const total = items.reduce((sum, item) => {
    const price = item.price_proveedor || item.price_promo || item.price_publico;
    return sum + (price * item.quantity);
  }, 0);

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      // PLANNED FOR FR-010: Call /create-payment-intent edge function here.
      // For now, simulate a successful flow.
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearCart();
      setCheckoutSuccess(true);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago. Por favor intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-surface-bright">
        <span className="material-symbols-outlined text-6xl text-text-meta opacity-50 mb-4">shopping_cart</span>
        <h2 className="text-2xl font-bold text-text-primary mb-4">Tu carrito está vacío</h2>
        <Link to="/" className="bg-belia-red text-white px-6 py-2 rounded-lg font-bold hover:bg-belia-red-deep">
          Continuar comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-bright py-12">
      <div className="max-w-7xl mx-auto px-margin flex flex-col lg:flex-row gap-8">
        
        {/* Checkout Form */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-divider p-8 shadow-sm">
            <h1 className="font-headline-lg text-3xl font-bold text-text-primary mb-8">Checkout</h1>
            
            {error && (
              <div className="bg-error/10 border border-error text-error p-4 rounded-lg mb-6 flex items-start gap-3">
                <span className="material-symbols-outlined">error</span>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <form id="checkout-form" onSubmit={handlePayment}>
              <h3 className="font-headline-sm font-bold text-lg text-text-primary mb-4 pb-2 border-b border-divider">
                Dirección de Envío
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Calle y número</label>
                  <input 
                    type="text" 
                    required 
                    value={shippingAddress.street}
                    onChange={e => setShippingAddress({...shippingAddress, street: e.target.value})}
                    className="w-full border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Ciudad</label>
                  <input 
                    type="text" 
                    required 
                    value={shippingAddress.city}
                    onChange={e => setShippingAddress({...shippingAddress, city: e.target.value})}
                    className="w-full border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Estado</label>
                  <input 
                    type="text" 
                    required 
                    value={shippingAddress.state}
                    onChange={e => setShippingAddress({...shippingAddress, state: e.target.value})}
                    className="w-full border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Código Postal</label>
                  <input 
                    type="text" 
                    required 
                    value={shippingAddress.zip}
                    onChange={e => setShippingAddress({...shippingAddress, zip: e.target.value})}
                    className="w-full border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">País</label>
                  <input 
                    type="text" 
                    disabled 
                    value="México"
                    className="w-full bg-gray-50 border-gray-300 rounded-lg text-text-meta"
                  />
                </div>
              </div>

              <h3 className="font-headline-sm font-bold text-lg text-text-primary mb-4 pb-2 border-b border-divider">
                Pago (Stripe Elements)
              </h3>
              
              <div className="bg-surface-dim border border-dashed border-gray-300 rounded-lg p-8 flex items-center justify-center mb-8">
                <p className="text-text-meta text-sm text-center">
                  <span className="material-symbols-outlined block text-3xl mb-2 opacity-50">credit_card</span>
                  Integración de Stripe pendiente (T033)
                </p>
              </div>

            </form>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="w-full lg:w-[400px]">
          <div className="bg-white rounded-xl border border-divider p-6 sticky top-24 shadow-sm">
            <h3 className="font-headline-sm font-bold text-xl text-text-primary mb-6">Resumen de Orden</h3>
            
            <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2">
              {items.map(item => {
                const currentPrice = item.price_proveedor || item.price_promo || item.price_publico;
                return (
                  <div key={item.product_id} className="flex gap-4 items-start">
                    <img src={item.image_url || ''} alt={item.name} className="w-16 h-16 object-contain bg-surface-dim rounded border border-divider" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary line-clamp-2">{item.name}</p>
                      <div className="flex justify-between mt-1">
                        <span className="text-sm text-text-secondary">Cant: {item.quantity}</span>
                        <span className="text-sm font-bold text-text-primary">{formatPrice(currentPrice * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-divider pt-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-text-secondary">Subtotal</span>
                <span className="font-medium text-text-primary">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-text-secondary">Envío (calculado por envía.com)</span>
                <span className="font-medium text-success-green">Gratis</span>
              </div>
              <div className="flex justify-between border-t border-divider pt-4 mt-4">
                <span className="font-bold text-lg text-text-primary">Total</span>
                <span className="font-bold text-xl text-belia-red">{formatPrice(total)}</span>
              </div>
            </div>

            <button 
              form="checkout-form"
              type="submit"
              disabled={isProcessing}
              className="w-full bg-belia-red text-white py-4 rounded-xl font-bold hover:bg-belia-red-deep transition-colors shadow-md disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin h-5 w-5 border-t-2 border-white rounded-full"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                  Pagar con Stripe
                </>
              )}
            </button>
            <p className="text-xs text-center text-text-meta mt-4 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[14px]">shield</span>
              Pago seguro encriptado
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
