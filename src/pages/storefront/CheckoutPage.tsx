import { useState, useEffect } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../../hooks/useAuth';
import { useCartStore } from '../../store/cartStore';
import { supabase } from '../../lib/supabase';

// Inicializar Stripe con la llave pública
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_placeholder');

function CheckoutForm({ 
  clientSecret, 
  shippingAddress, 
  totalAmount, 
  shippingCost 
}: { 
  clientSecret: string, 
  shippingAddress: any, 
  totalAmount: number, 
  shippingCost: number 
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { items, clearCart, setCheckoutSuccess } = useCartStore();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || items.length === 0 || !user) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) throw submitError;

      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.origin + '/checkout/success',
          payment_method_data: {
            billing_details: {
              address: {
                line1: shippingAddress.street,
                city: shippingAddress.city,
                state: shippingAddress.state,
                postal_code: shippingAddress.zip,
                country: 'MX'
              }
            }
          }
        },
        redirect: 'if_required',
      });

      if (result.error) {
        throw result.error;
      }

      if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        // Crear Orden en Supabase (Solo como fallback si no se usan webhooks, lo cual es el caso para este MVP)
        const { data: order, error: orderError } = await (supabase.from('orders') as any).insert({
          user_id: user?.id,
          tipo: user.role === 'proveedor' ? 'mayoreo' : 'publico',
          status: 'Procesando',
          total_amount: totalAmount,
          shipping_address: shippingAddress,
          stripe_payment_intent: result.paymentIntent.id
        }).select().single();

        if (orderError) throw orderError;

        // Crear Order Items
        const orderItems = items.map(item => {
          const currentPrice = item.price_proveedor || item.price_promo || item.price_publico;
          return {
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: currentPrice
          };
        });

        const { error: itemsError } = await (supabase.from('order_items') as any).insert(orderItems);
        if (itemsError) throw itemsError;

        clearCart();
        setCheckoutSuccess(true);
        navigate('/'); // Redirigir a inicio con éxito
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago. Por favor intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const subtotal = items.reduce((sum, item) => {
    const price = item.price_proveedor || item.price_promo || item.price_publico;
    return sum + (price * item.quantity);
  }, 0);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
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
              Pago con Tarjeta
            </h3>
            
            <div className="bg-surface-dim rounded-lg p-6 mb-8 border border-divider">
              <PaymentElement />
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
              <span className="font-medium text-text-primary">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-text-secondary">Envío</span>
              <span className="font-medium text-text-primary">{shippingCost === 0 ? <span className="text-success-green">Gratis</span> : formatPrice(shippingCost)}</span>
            </div>
            <div className="flex justify-between border-t border-divider pt-4 mt-4">
              <span className="font-bold text-lg text-text-primary">Total</span>
              <span className="font-bold text-xl text-belia-red">{formatPrice(totalAmount)}</span>
            </div>
          </div>

          <button 
            form="checkout-form"
            type="submit"
            disabled={!stripe || isProcessing}
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
                Pagar {formatPrice(totalAmount)}
              </>
            )}
          </button>
          <p className="text-xs text-center text-text-meta mt-4 flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[14px]">shield</span>
            Pago seguro procesado por Stripe
          </p>
        </div>
      </div>
    </div>
  );
}

export function CheckoutPage() {
  const { user, loading } = useAuth();
  const { items } = useCartStore();
  
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'MX'
  });
  
  const [clientSecret, setClientSecret] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (!user || items.length === 0) return;

    const initPayment = async () => {
      setIsInitializing(true);
      setFetchError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
        
        const response = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            items,
            shipping_address: shippingAddress
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          if (response.status === 409 && data.error === 'INSUFFICIENT_STOCK') {
            const details = data.details.map((d: any) => `${d.name} (Disp: ${d.available})`).join(', ');
            throw new Error(`Stock insuficiente: ${details}`);
          }
          throw new Error(data.error || 'Error al conectar con el procesador de pagos.');
        }

        setClientSecret(data.clientSecret);
        setTotalAmount(data.totalAmount);
        setShippingCost(data.shippingCost);
      } catch (err: any) {
        setFetchError(err.message);
      } finally {
        setIsInitializing(false);
      }
    };

    // We use a debounce or direct call. Here we call it directly once shipping address form is valid.
    // For simplicity in MVP, we just initialize it immediately since shipping doesn't affect the backend calculation yet.
    // In a full implementation, you'd re-fetch if shipping address affects shipping cost.
    initPayment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, items]); // Only re-fetch if items change.

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center"><div className="animate-spin h-10 w-10 border-t-4 border-belia-red rounded-full"></div></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: '/checkout' }} />;
  }

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
      <div className="max-w-7xl mx-auto px-margin">
        
        {fetchError && (
          <div className="bg-error/10 border border-error text-error p-6 rounded-xl mb-8">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined">warning</span>
              No se pudo inicializar el pago
            </h3>
            <p>{fetchError}</p>
            <Link to="/" className="inline-block mt-4 text-belia-red font-bold hover:underline">
              Volver al carrito para modificar productos
            </Link>
          </div>
        )}

        {/* Shipping Address Form (Solo vista si ya cargó el form de stripe, o podemos pedirlo antes) */}
        {!clientSecret && !fetchError && isInitializing && (
           <div className="flex justify-center items-center py-20">
             <div className="animate-spin h-10 w-10 border-t-4 border-belia-red rounded-full"></div>
             <span className="ml-4 text-text-secondary font-medium">Preparando pago seguro...</span>
           </div>
        )}

        {clientSecret && (
          <>
            <div className="bg-white rounded-xl border border-divider p-8 shadow-sm mb-8 lg:w-[calc(100%-432px)]">
              <h3 className="font-headline-sm font-bold text-lg text-text-primary mb-4 pb-2 border-b border-divider">
                Dirección de Envío
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Calle y número</label>
                  <input type="text" required value={shippingAddress.street} onChange={e => setShippingAddress({...shippingAddress, street: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Ciudad</label>
                  <input type="text" required value={shippingAddress.city} onChange={e => setShippingAddress({...shippingAddress, city: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Estado</label>
                  <input type="text" required value={shippingAddress.state} onChange={e => setShippingAddress({...shippingAddress, state: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Código Postal</label>
                  <input type="text" required value={shippingAddress.zip} onChange={e => setShippingAddress({...shippingAddress, zip: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-belia-red focus:border-belia-red" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">País</label>
                  <input type="text" disabled value="México" className="w-full bg-gray-50 border-gray-300 rounded-lg text-text-meta" />
                </div>
              </div>
            </div>

            <Elements options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#E31B23' } } }} stripe={stripePromise}>
              <CheckoutForm 
                clientSecret={clientSecret} 
                shippingAddress={shippingAddress} 
                totalAmount={totalAmount}
                shippingCost={shippingCost}
              />
            </Elements>
          </>
        )}
      </div>
    </div>
  );
}
