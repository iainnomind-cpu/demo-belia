// supabase/functions/create-payment-intent/index.ts
// Belia — Stripe Payment Intent Creation & Stock Validation
// Validates current cart stock, creates a Stripe Payment Intent, 
// and optionally calls envía.com API for shipping costs.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { items, shipping_address } = await req.json();

    if (!items || !items.length) {
      throw new Error('Cart is empty');
    }

    // 1. Validate user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // 2. Extract product IDs and fetch fresh prices/stock from DB to prevent tampering
    const productIds = items.map((item: any) => item.product_id);
    const { data: dbProducts, error: dbError } = await supabaseAdmin
      .from('products')
      .select('id, price_publico, price_promo, stock')
      .in('id', productIds);

    if (dbError || !dbProducts) {
      throw new Error('Error fetching product data');
    }

    let isProveedor = user.user_metadata?.role === 'proveedor';
    let supplierPrices: Record<string, number | null> = {};

    // 3. Fetch B2B prices if role is proveedor
    if (isProveedor) {
      const { data: spData } = await supabaseAdmin.rpc('get_supplier_products');
      if (spData) {
        spData.forEach((p: any) => {
          supplierPrices[p.id] = p.price_proveedor;
        });
      }
    }

    // 4. Calculate total securely and check stock
    let totalCents = 0;
    const outOfStockItems = [];

    for (const item of items) {
      const dbProduct = dbProducts.find((p) => p.id === item.product_id);
      
      if (!dbProduct) {
        throw new Error(`Product not found: ${item.product_id}`);
      }

      // Concurrency/Race Condition Check
      if (dbProduct.stock < item.quantity) {
        outOfStockItems.push({
          product_id: item.product_id,
          name: item.name,
          requested: item.quantity,
          available: dbProduct.stock
        });
        continue;
      }

      // Determine correct price
      let effectivePrice = dbProduct.price_promo || dbProduct.price_publico;
      if (isProveedor && supplierPrices[dbProduct.id]) {
        effectivePrice = supplierPrices[dbProduct.id] as number;
      }

      totalCents += Math.round(effectivePrice * item.quantity * 100);
    }

    // 5. Abort if any item is out of stock (Stock Race Condition Protection)
    if (outOfStockItems.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'INSUFFICIENT_STOCK',
        details: outOfStockItems 
      }), { 
        status: 409, // Conflict
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 6. Calculate Shipping (Mocking envía.com integration for MVP)
    let shippingCostCents = 15000; // Default $150.00 MXN
    
    // Si la compra es mayor a $1500 MXN, envío gratis
    if (totalCents >= 150000) {
      shippingCostCents = 0;
    }

    totalCents += shippingCostCents;

    // 7. Create Stripe Payment Intent
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'mxn',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: user.id,
        is_b2b: isProveedor ? 'true' : 'false'
      }
    });

    return new Response(JSON.stringify({ 
      clientSecret: paymentIntent.client_secret,
      totalAmount: totalCents / 100,
      shippingCost: shippingCostCents / 100
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Payment intent error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
