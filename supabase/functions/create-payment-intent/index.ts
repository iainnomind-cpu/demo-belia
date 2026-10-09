// supabase/functions/create-payment-intent/index.ts
// Belia — Stripe Payment Intent Creation & Stock Validation
// Validates current cart stock, creates a Stripe Payment Intent,
// and optionally calls envía.com API for shipping costs.

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

const SHIPPING_COST_CENTS = 15000;        // $150.00 MXN
const FREE_SHIPPING_FROM_CENTS = 150000;  // $1,500.00 MXN
const METADATA_CHUNK = 450;               // Stripe metadata values are limited to 500 chars

// Same rule as src/lib/pricing.ts: a promo only counts if it is a real discount
const validPromo = (publico: number, promo: number | null) =>
  promo && promo > 0 && promo < publico ? promo : null;

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
    const { items } = await req.json() as { items?: Array<{ product_id: string; quantity: number; name?: string }> };

    if (!items || !items.length) {
      throw new Error('El carrito está vacío');
    }

    // Quantities come from the browser: reject anything that is not a positive integer
    // (a negative quantity would otherwise lower the total).
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) {
        throw new Error('Cantidad inválida en el carrito');
      }
    }

    // 1. Validate user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // 2. Fetch fresh prices/stock from DB to prevent tampering.
    // The service role can read price_proveedor directly (the get_supplier_products
    // RPC checks the caller's JWT, which is empty when called with the service role).
    const productIds = items.map((item) => item.product_id);
    const { data: dbProducts, error: dbError } = await supabaseAdmin
      .from('products')
      .select('id, name, price_publico, price_promo, price_proveedor, stock, is_active, image_url')
      .in('id', productIds);

    if (dbError || !dbProducts) {
      throw new Error('Error fetching product data');
    }

    const isProveedor = user.app_metadata?.role === 'proveedor';

    // 3. Calculate total securely and check stock
    let totalCents = 0;
    const outOfStockItems = [];

    for (const item of items) {
      const dbProduct = dbProducts.find((p) => p.id === item.product_id);

      // Same rule as the storefront: inactive products or products without a photo are not sold
      if (!dbProduct || !dbProduct.is_active || !dbProduct.image_url) {
        throw new Error(`Un producto del carrito ya no está disponible${item.name ? `: ${item.name}` : ''}`);
      }

      // Concurrency/Race Condition Check
      if (dbProduct.stock < item.quantity) {
        outOfStockItems.push({
          product_id: item.product_id,
          name: dbProduct.name,
          requested: item.quantity,
          available: dbProduct.stock,
        });
        continue;
      }

      let effectivePrice = validPromo(dbProduct.price_publico, dbProduct.price_promo) ?? dbProduct.price_publico;
      if (isProveedor && dbProduct.price_proveedor) {
        effectivePrice = dbProduct.price_proveedor;
      }

      totalCents += Math.round(effectivePrice * 100) * item.quantity;
    }

    // 4. Abort if any item is out of stock (Stock Race Condition Protection)
    if (outOfStockItems.length > 0) {
      return json({ error: 'INSUFFICIENT_STOCK', details: outOfStockItems }, 409);
    }

    // 5. Shipping (Mocking envía.com integration for MVP)
    const shippingCostCents = totalCents >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING_COST_CENTS;
    totalCents += shippingCostCents;

    // 6. The validated cart travels inside the Payment Intent so confirm-order
    // creates the order from what was actually charged, not from the browser.
    const cart = JSON.stringify(items.map((i) => [i.product_id, i.quantity]));
    const cartMetadata: Record<string, string> = {};
    for (let i = 0; i * METADATA_CHUNK < cart.length; i++) {
      cartMetadata[`cart_${i}`] = cart.slice(i * METADATA_CHUNK, (i + 1) * METADATA_CHUNK);
    }
    if (Object.keys(cartMetadata).length > 45) {
      throw new Error('El carrito tiene demasiados productos distintos para un solo pedido');
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'mxn',
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id: user.id,
        is_b2b: isProveedor ? 'true' : 'false',
        shipping_cents: String(shippingCostCents),
        ...cartMetadata,
      },
    });

    return json({
      clientSecret: paymentIntent.client_secret,
      totalAmount: totalCents / 100,
      shippingCost: shippingCostCents / 100,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Payment intent error:', message);
    return json({ error: message }, 400);
  }
});
