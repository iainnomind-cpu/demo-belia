// supabase/functions/confirm-order/index.ts
// Belia — Creates the order from a Stripe payment. Called two ways:
//  - by the checkout page, with the customer's token;
//  - by Stripe as a webhook (stripe-signature header), because an OXXO voucher
//    is paid days later, when the customer is no longer on the site.
// Requires "Verify JWT" turned off for this function so Stripe can reach it:
// the customer's token is checked below instead.
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
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const PENDING_PAYMENT = 'Pendiente de pago';

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
  email?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

type Admin = ReturnType<typeof createClient>;

// The voucher was issued and is waiting for the cash payment (a 3D Secure card is also requires_action)
const isOxxoPending = (pi: Stripe.PaymentIntent) =>
  pi.status === 'requires_action' && pi.next_action?.type === 'oxxo_display_details';

const voucherUrl = (pi: Stripe.PaymentIntent) => pi.next_action?.oxxo_display_details?.hosted_voucher_url ?? null;

// Saved on the payment by the checkout (confirmParams.shipping), so the webhook has it too
const addressFromPayment = (pi: Stripe.PaymentIntent): ShippingAddress => ({
  name: pi.shipping?.name ?? undefined,
  phone: pi.shipping?.phone ?? undefined,
  street: pi.shipping?.address?.line1 ?? undefined,
  city: pi.shipping?.address?.city ?? undefined,
  state: pi.shipping?.address?.state ?? undefined,
  zip: pi.shipping?.address?.postal_code ?? undefined,
});

// ── Emails ───────────────────────────────────────────────────
// A failed email never fails the order (the payment is already done).

/** Confirmation to the customer + new-order notice to the store */
async function sendPaidEmails(supabaseAdmin: Admin, orderId: string, pi: Stripe.PaymentIntent, siteUrl: string) {
  try {
    const { data: order } = await supabaseAdmin.from('orders').select('shipping_address').eq('id', orderId).single();
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('quantity, unit_price, product:products(name, sku)')
      .eq('order_id', orderId);
    const address = (order?.shipping_address ?? {}) as ShippingAddress;
    const isB2B = pi.metadata.is_b2b === 'true';

    const biz = await loadBusinessInfo(supabaseAdmin);
    const store = biz.nombre_comercial || 'Belia';
    const number = orderId.split('-')[0].toUpperCase();
    const shippingCost = Number(pi.metadata.shipping_cents ?? 0) / 100;
    const rows = ((items ?? []) as unknown as Array<{ quantity: number; unit_price: number; product: { name?: string; sku?: string } | null }>).map((i) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px">${esc(i.product?.name ?? 'Producto')}<br><span style="color:#999;font-size:12px">SKU ${esc(i.product?.sku ?? '')} · Cant. ${i.quantity}</span></td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;text-align:right;white-space:nowrap">${money(i.unit_price * i.quantity)}</td>
      </tr>`).join('');
    const summary = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
      <tr><td style="padding:8px 0;font-size:14px;color:#777">Envío</td><td style="padding:8px 0;text-align:right;font-size:14px">${shippingCost === 0 ? 'Gratis' : money(shippingCost)}</td></tr>
      <tr><td style="padding:8px 0;font-size:16px;font-weight:bold">Total</td><td style="padding:8px 0;text-align:right;font-size:16px;font-weight:bold">${money(pi.amount / 100)}</td></tr>
    </table>`;
    const shippingBlock = `<p style="font-size:14px;line-height:1.5;margin:16px 0 0"><strong>Envío a:</strong><br>
      ${esc(address.name)}<br>${esc(address.street)}, ${esc(address.city)}, ${esc(address.state)}, C.P. ${esc(address.zip)}<br>Tel. ${esc(address.phone)}</p>`;

    const sends: Promise<boolean>[] = [];
    if (address.email) {
      sends.push(sendMail(store, address.email, `Confirmación de tu pedido #${number}`, emailLayout(biz, `¡Gracias por tu compra, ${esc(String(address.name).split(' ')[0])}!`, `
        <p style="font-size:14px;line-height:1.5">Recibimos tu pago y ya estamos preparando tu pedido <strong>#${number}</strong>. Te avisaremos por correo cuando sea enviado.</p>
        ${summary}${shippingBlock}
        <p style="margin:24px 0 0"><a href="${esc(siteUrl)}/pedido/${orderId}" style="background:#F6423C;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;font-size:14px;display:inline-block">Ver mi pedido</a></p>`)));
    }
    const storeEmail = biz.email || GMAIL_USER;
    if (storeEmail) {
      sends.push(sendMail(store, storeEmail, `🛍️ Nuevo pedido #${number} — ${money(pi.amount / 100)}`, emailLayout(biz, `Nuevo pedido #${number}`, `
        <p style="font-size:14px;line-height:1.5">Cliente: <strong>${esc(address.name)}</strong> · ${esc(address.email)} · ${esc(address.phone)}<br>Tipo: ${isB2B ? 'Mayoreo (B2B)' : 'Público'}</p>
        ${summary}${shippingBlock}
        <p style="margin:24px 0 0"><a href="${esc(siteUrl)}/admin/orders" style="background:#232323;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;font-size:14px;display:inline-block">Abrir en el administrador</a></p>`)));
    }
    const results = await Promise.allSettled(sends);
    results.forEach((r) => { if (r.status === 'rejected') console.error('Order email failed:', r.reason); });
  } catch (mailErr) {
    console.error('Order emails failed:', mailErr);
  }
}

/** To the customer only: about their OXXO voucher (issued or expired) */
async function sendVoucherEmail(supabaseAdmin: Admin, to: string | undefined, subject: string, title: string, body: string) {
  if (!to) return;
  try {
    const biz = await loadBusinessInfo(supabaseAdmin);
    await sendMail(biz.nombre_comercial || 'Belia', to, subject, emailLayout(biz, title, body));
  } catch (mailErr) {
    console.error('Voucher email failed:', mailErr);
  }
}

// ── Order lifecycle ──────────────────────────────────────────

/** Voucher paid. The status filter makes only one caller win, so emails go out once. */
async function markPaid(supabaseAdmin: Admin, orderId: string, pi: Stripe.PaymentIntent, siteUrl: string) {
  const { data: updated } = await supabaseAdmin
    .from('orders')
    .update({ status: 'Procesando', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', PENDING_PAYMENT)
    .select('id');
  if (updated?.length) await sendPaidEmails(supabaseAdmin, orderId, pi, siteUrl);
}

/** Voucher expired or cancelled: free the reserved stock. No-op for orders that are not pending. */
async function cancelPending(supabaseAdmin: Admin, paymentIntentId: string) {
  const { data: updated } = await supabaseAdmin
    .from('orders')
    .update({ status: 'Cancelado', updated_at: new Date().toISOString() })
    .eq('stripe_payment_intent', paymentIntentId)
    .eq('status', PENDING_PAYMENT)
    .select('id, shipping_address');
  const order = updated?.[0];
  if (!order) return;

  const { data: items } = await supabaseAdmin.from('order_items').select('product_id, quantity').eq('order_id', order.id);
  for (const item of items ?? []) {
    const { error } = await supabaseAdmin.rpc('increment_stock', {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    });
    if (error) console.error('increment_stock failed', item.product_id, error.message);
  }

  const number = String(order.id).split('-')[0].toUpperCase();
  await sendVoucherEmail(supabaseAdmin, (order.shipping_address as ShippingAddress)?.email,
    `Tu ficha OXXO del pedido #${number} venció`, 'Tu ficha OXXO venció',
    `<p style="font-size:14px;line-height:1.5">No recibimos el pago de tu pedido <strong>#${number}</strong>, así que lo cancelamos. No se te cobró nada. Si todavía lo quieres, puedes volver a hacer tu compra en la tienda.</p>`);
}

/** Creates the order for a paid payment or an issued OXXO voucher, or finds the one that exists. */
async function processPayment(supabaseAdmin: Admin, pi: Stripe.PaymentIntent, address: ShippingAddress, siteUrl: string): Promise<string> {
  const paid = pi.status === 'succeeded';

  // Already created (retry, webhook + browser, page reload after redirect, double click)
  const { data: existing } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('stripe_payment_intent', pi.id)
    .maybeSingle();
  if (existing) {
    if (paid) await markPaid(supabaseAdmin, existing.id, pi, siteUrl);
    return existing.id;
  }

  if (!address.name?.trim() || !address.phone?.trim() || !address.street?.trim() || !address.city?.trim() || !address.state?.trim() || !address.zip?.trim()) {
    throw new Error('La dirección de envío está incompleta');
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

  // The webhook has no logged-in customer: the owner is the one who started the payment.
  // Their email is stored with the order so the admin can contact them.
  const { data: owner } = await supabaseAdmin.auth.admin.getUserById(pi.metadata.user_id);
  const email = owner?.user?.email;

  // ── Create order ─────────────────────────────────────────
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: pi.metadata.user_id,
      tipo: isB2B ? 'mayoreo' : 'publico',
      status: paid ? 'Procesando' : PENDING_PAYMENT,
      total_amount: pi.amount / 100, // What was actually charged
      shipping_address: { ...address, email, country: 'MX' },
      stripe_payment_intent: pi.id,
      payment_voucher_url: voucherUrl(pi),
    })
    .select('id')
    .single();

  if (orderError) {
    // Unique index on stripe_payment_intent: a concurrent call already created it
    const { data: race } = await supabaseAdmin
      .from('orders').select('id').eq('stripe_payment_intent', pi.id).maybeSingle();
    if (race) {
      if (paid) await markPaid(supabaseAdmin, race.id, pi, siteUrl);
      return race.id;
    }
    throw new Error(`No se pudo crear el pedido: ${orderError.message}`);
  }

  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(orderItems.map((i) => ({ ...i, order_id: order.id })));
  if (itemsError) {
    console.error('order_items insert failed', order.id, itemsError.message);
  }

  // ── Decrement stock (for a voucher, this reserves it until it is paid or expires) ──
  for (const [productId, quantity] of cart) {
    const { error } = await supabaseAdmin.rpc('decrement_stock', {
      p_product_id: productId,
      p_quantity: quantity,
    });
    if (error) console.error('decrement_stock failed', productId, error.message);
  }

  if (paid) {
    await sendPaidEmails(supabaseAdmin, order.id, pi, siteUrl);
  } else {
    const number = String(order.id).split('-')[0].toUpperCase();
    await sendVoucherEmail(supabaseAdmin, email,
      `Tu ficha OXXO del pedido #${number}`, 'Paga tu ficha en OXXO',
      `<p style="font-size:14px;line-height:1.5">Apartamos tus productos del pedido <strong>#${number}</strong> por <strong>${money(pi.amount / 100)}</strong>. Paga en efectivo en cualquier OXXO antes de que venza la ficha; empezaremos a prepararlo cuando se confirme tu pago.</p>
       <p style="margin:24px 0 0"><a href="${esc(voucherUrl(pi) ?? `${siteUrl}/pedido/${order.id}`)}" style="background:#F6423C;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;font-size:14px;display:inline-block">Ver mi ficha</a></p>`);
  }

  return order.id;
}

// ── Stripe webhook ───────────────────────────────────────────
async function handleWebhook(req: Request, stripe: Stripe, supabaseAdmin: Admin, signature: string): Promise<Response> {
  if (!STRIPE_WEBHOOK_SECRET) {
    return json({ error: 'Falta el secret STRIPE_WEBHOOK_SECRET en Supabase.' }, 500);
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(), signature, STRIPE_WEBHOOK_SECRET, undefined, Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    console.error('Invalid webhook signature:', err);
    return json({ error: 'Invalid signature' }, 400);
  }

  if (!event.type.startsWith('payment_intent.')) return json({ received: true });

  // Events can arrive out of order: decide from the payment's current state
  const pi = await stripe.paymentIntents.retrieve((event.data.object as Stripe.PaymentIntent).id);
  if (!pi.metadata?.user_id) return json({ received: true }); // Not a store checkout

  if (pi.status === 'succeeded' || isOxxoPending(pi)) {
    await processPayment(supabaseAdmin, pi, addressFromPayment(pi), DEFAULT_SITE_URL);
  } else if (event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
    await cancelPending(supabaseAdmin, pi.id);
  }
  return json({ received: true });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }
  if (!STRIPE_SECRET_KEY) {
    return json({ error: 'Falta el secret STRIPE_SECRET_KEY en Supabase.' }, 500);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const signature = req.headers.get('stripe-signature');
    if (signature) {
      return await handleWebhook(req, stripe, supabaseAdmin, signature);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401);
    }

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

    // ── Verify the payment with Stripe ───────────────────────
    const pi = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (pi.metadata?.user_id !== user.id) {
      return json({ error: 'Este pago no pertenece a tu cuenta' }, 403);
    }
    if (pi.status !== 'succeeded' && !isOxxoPending(pi)) {
      return json({ error: `El pago no se ha completado (estado: ${pi.status})` }, 409);
    }

    const orderId = await processPayment(
      supabaseAdmin, pi, shipping_address ?? addressFromPayment(pi), req.headers.get('origin') ?? DEFAULT_SITE_URL,
    );
    return json({ success: true, order_id: orderId });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('confirm-order error:', message);
    return json({ error: message }, 500);
  }
});
