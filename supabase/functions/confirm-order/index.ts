// supabase/functions/confirm-order/index.ts
// Belia — Creates the order after a successful Stripe payment.
// The order is built from the Payment Intent (amount + cart stored in its metadata
// by create-payment-intent), never from prices sent by the browser.
// Idempotent: calling it twice for the same payment returns the same order.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Same rule as src/lib/pricing.ts
const validPromo = (publico: number, promo: number | null) =>
  promo && promo > 0 && promo < publico ? promo : null;

interface ShippingAddress {
  name?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!STRIPE_SECRET_KEY) {
    return json({ error: 'Falta el secret STRIPE_SECRET_KEY en Supabase.' }, 500);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return json({ error: 'Invalid authentication token' }, 401);
    }

    const { payment_intent_id, shipping_address } = await req.json() as {
      payment_intent_id?: string;
      shipping_address?: ShippingAddress;
    };

    if (!payment_intent_id) {
      return json({ error: 'Falta payment_intent_id' }, 400);
    }

    // Already created (retry, page reload after redirect, double click)
    const { data: existing } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('stripe_payment_intent', payment_intent_id)
      .maybeSingle();
    if (existing) {
      return json({ success: true, order_id: existing.id });
    }

    const address = shipping_address ?? {};
    if (!address.name?.trim() || !address.phone?.trim() || !address.street?.trim() || !address.city?.trim() || !address.state?.trim() || !address.zip?.trim()) {
      return json({ error: 'La dirección de envío está incompleta' }, 400);
    }

    // ── Verify the payment with Stripe ───────────────────────
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });
    const pi = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (pi.metadata?.user_id !== user.id) {
      return json({ error: 'Este pago no pertenece a tu cuenta' }, 403);
    }
    if (pi.status !== 'succeeded') {
      return json({ error: `El pago no se ha completado (estado: ${pi.status})` }, 409);
    }

    const cartJson = Object.keys(pi.metadata)
      .filter((k) => k.startsWith('cart_'))
      .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)))
      .map((k) => pi.metadata[k])
      .join('');
    const cart = JSON.parse(cartJson || '[]') as Array<[string, number]>;
    if (cart.length === 0) {
      throw new Error('El pago no contiene productos');
    }

    // ── Unit price snapshot (same rules as create-payment-intent) ──
    const isB2B = pi.metadata.is_b2b === 'true';
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, price_publico, price_promo, price_proveedor')
      .in('id', cart.map(([id]) => id));
    if (productsError || !products) throw new Error('Error fetching product data');

    const orderItems = cart.map(([productId, quantity]) => {
      const p = products.find((x) => x.id === productId);
      const unitPrice = !p ? 0
        : isB2B && p.price_proveedor ? p.price_proveedor
        : validPromo(p.price_publico, p.price_promo) ?? p.price_publico;
      return { product_id: productId, quantity, unit_price: unitPrice };
    });

    // ── Create order ─────────────────────────────────────────
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: user.id,
        tipo: isB2B ? 'mayoreo' : 'publico',
        status: 'Procesando',
        total_amount: pi.amount / 100, // What was actually charged
        // The customer's email is stored with the order so the admin can contact them
        shipping_address: { ...address, email: user.email, country: 'MX' },
        stripe_payment_intent: pi.id,
      })
      .select('id')
      .single();

    if (orderError) {
      // Unique index on stripe_payment_intent: a concurrent call already created it
      const { data: race } = await supabaseAdmin
        .from('orders').select('id').eq('stripe_payment_intent', pi.id).maybeSingle();
      if (race) return json({ success: true, order_id: race.id });
      throw new Error(`No se pudo crear el pedido: ${orderError.message}`);
    }

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems.map((i) => ({ ...i, order_id: order.id })));
    if (itemsError) {
      console.error('order_items insert failed', order.id, itemsError.message);
    }

    // ── Decrement stock ──────────────────────────────────────
    for (const [productId, quantity] of cart) {
      const { error } = await supabaseAdmin.rpc('decrement_stock', {
        p_product_id: productId,
        p_quantity: quantity,
      });
      if (error) console.error('decrement_stock failed', productId, error.message);
    }

    return json({ success: true, order_id: order.id });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('confirm-order error:', message);
    return json({ error: message }, 500);
  }
});
