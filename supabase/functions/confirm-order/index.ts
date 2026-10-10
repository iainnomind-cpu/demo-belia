// supabase/functions/confirm-order/index.ts
// Belia — Creates the order after a successful Stripe payment.
// The order is built from the Payment Intent (amount + cart stored in its metadata
// by create-payment-intent), never from prices sent by the browser.
// Idempotent: calling it twice for the same payment returns the same order.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';
import nodemailer from 'npm:nodemailer@6.9.16';

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

// ── Email (Gmail SMTP) ───────────────────────────────────────
// Self-contained on purpose: each Edge Function is deployed by pasting a single
// file in the Supabase dashboard. Port 465 (SMTPS) — Supabase blocks 25 and 587.
const GMAIL_USER = Deno.env.get('GMAIL_USER');
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');
const DEFAULT_SITE_URL = Deno.env.get('SITE_URL') ?? 'https://demo-belia.vercel.app';

interface BusinessInfo { nombre_comercial?: string; email?: string; whatsapp?: string; telefono?: string; razon_social?: string }

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

async function loadBusinessInfo(supabase: ReturnType<typeof createClient>): Promise<BusinessInfo> {
  const { data } = await supabase.from('site_content').select('content_data').eq('id', 'business_info').maybeSingle();
  return (data?.content_data as BusinessInfo) ?? {};
}

function emailLayout(biz: BusinessInfo, title: string, body: string): string {
  const store = esc(biz.nombre_comercial || 'Belia');
  const contact = [
    biz.email && `<a href="mailto:${esc(biz.email)}" style="color:#F6423C">${esc(biz.email)}</a>`,
    biz.whatsapp && `<a href="https://wa.me/${esc(String(biz.whatsapp).replace(/\D/g, ''))}" style="color:#F6423C">WhatsApp</a>`,
  ].filter(Boolean).join(' · ');
  return `<!doctype html><html><body style="margin:0;background:#FDF8F5;font-family:Arial,Helvetica,sans-serif;color:#232323">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FDF8F5;padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0e6e2">
      <tr><td style="background:#F6423C;padding:20px 28px;color:#ffffff;font-size:22px;font-weight:bold">${store}</td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 16px;font-size:22px;color:#232323">${title}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:18px 28px;background:#FFF0F3;font-size:12px;color:#777">
        ¿Dudas? Escríbenos${contact ? `: ${contact}` : ''}.<br>${esc(biz.razon_social || biz.nombre_comercial || 'Belia')}
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

async function sendMail(fromName: string, to: string, subject: string, html: string): Promise<boolean> {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.warn('Email skipped: GMAIL_USER / GMAIL_APP_PASSWORD secrets are not set');
    return false;
  }
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({ from: `"${fromName.replace(/"/g, '')}" <${GMAIL_USER}>`, to, subject, html });
  return true;
}

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
      .select('id, name, sku, price_publico, price_promo, price_proveedor')
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

    // ── Emails: confirmation to the customer + new-order notice to the store ──
    // A failed email never fails the order (the payment is already done).
    try {
      const biz = await loadBusinessInfo(supabaseAdmin);
      const store = biz.nombre_comercial || 'Belia';
      const siteUrl = req.headers.get('origin') ?? DEFAULT_SITE_URL;
      const number = String(order.id).split('-')[0].toUpperCase();
      const shippingCost = Number(pi.metadata.shipping_cents ?? 0) / 100;
      const rows = orderItems.map((i) => {
        const p = products.find((x) => x.id === i.product_id);
        return `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px">${esc(p?.name ?? 'Producto')}<br><span style="color:#999;font-size:12px">SKU ${esc(p?.sku ?? '')} · Cant. ${i.quantity}</span></td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;text-align:right;white-space:nowrap">${money(i.unit_price * i.quantity)}</td>
        </tr>`;
      }).join('');
      const summary = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
        <tr><td style="padding:8px 0;font-size:14px;color:#777">Envío</td><td style="padding:8px 0;text-align:right;font-size:14px">${shippingCost === 0 ? 'Gratis' : money(shippingCost)}</td></tr>
        <tr><td style="padding:8px 0;font-size:16px;font-weight:bold">Total</td><td style="padding:8px 0;text-align:right;font-size:16px;font-weight:bold">${money(pi.amount / 100)}</td></tr>
      </table>`;
      const shippingBlock = `<p style="font-size:14px;line-height:1.5;margin:16px 0 0"><strong>Envío a:</strong><br>
        ${esc(address.name)}<br>${esc(address.street)}, ${esc(address.city)}, ${esc(address.state)}, C.P. ${esc(address.zip)}<br>Tel. ${esc(address.phone)}</p>`;

      const sends: Promise<boolean>[] = [];
      if (user.email) {
        sends.push(sendMail(store, user.email, `Confirmación de tu pedido #${number}`, emailLayout(biz, `¡Gracias por tu compra, ${esc(String(address.name).split(' ')[0])}!`, `
          <p style="font-size:14px;line-height:1.5">Recibimos tu pago y ya estamos preparando tu pedido <strong>#${number}</strong>. Te avisaremos por correo cuando sea enviado.</p>
          ${summary}${shippingBlock}
          <p style="margin:24px 0 0"><a href="${esc(siteUrl)}/pedido/${order.id}" style="background:#F6423C;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;font-size:14px;display:inline-block">Ver mi pedido</a></p>`)));
      }
      const storeEmail = biz.email || GMAIL_USER;
      if (storeEmail) {
        sends.push(sendMail(store, storeEmail, `🛍️ Nuevo pedido #${number} — ${money(pi.amount / 100)}`, emailLayout(biz, `Nuevo pedido #${number}`, `
          <p style="font-size:14px;line-height:1.5">Cliente: <strong>${esc(address.name)}</strong> · ${esc(user.email)} · ${esc(address.phone)}<br>Tipo: ${isB2B ? 'Mayoreo (B2B)' : 'Público'}</p>
          ${summary}${shippingBlock}
          <p style="margin:24px 0 0"><a href="${esc(siteUrl)}/admin/orders" style="background:#232323;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;font-size:14px;display:inline-block">Abrir en el administrador</a></p>`)));
      }
      const results = await Promise.allSettled(sends);
      results.forEach((r) => { if (r.status === 'rejected') console.error('Order email failed:', r.reason); });
    } catch (mailErr) {
      console.error('Order emails failed:', mailErr);
    }

    return json({ success: true, order_id: order.id });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('confirm-order error:', message);
    return json({ error: message }, 500);
  }
});
