// supabase/functions/notify-order-status/index.ts
// Belia — Emails the customer when the admin changes an order's status
// (Enviado / Entregado / Cancelado). Called from the admin orders page.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.16';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

const STATUS_COPY: Record<string, { subject: string; title: string; text: string }> = {
  Enviado: {
    subject: 'Tu pedido #{n} va en camino 🚚',
    title: '¡Tu pedido va en camino!',
    text: 'Tu pedido <strong>#{n}</strong> ya fue enviado.',
  },
  Entregado: {
    subject: 'Tu pedido #{n} fue entregado',
    title: '¡Tu pedido fue entregado!',
    text: 'Tu pedido <strong>#{n}</strong> fue entregado. Esperamos que disfrutes tus productos.',
  },
  Cancelado: {
    subject: 'Tu pedido #{n} fue cancelado',
    title: 'Tu pedido fue cancelado',
    text: 'Tu pedido <strong>#{n}</strong> fue cancelado. Si se realizó un cobro, el reembolso se hará al mismo método de pago en un plazo de 5 a 10 días hábiles según tu banco. Si tienes dudas, contáctanos.',
  },
};

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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user || user.app_metadata?.role !== 'admin') {
    return json({ error: 'Forbidden: admin role required' }, 403);
  }

  try {
    const { order_id } = await req.json() as { order_id?: string };
    if (!order_id) return json({ error: 'Falta order_id' }, 400);

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, user_id, status, shipping_address, tracking_info')
      .eq('id', order_id)
      .single();
    if (error || !order) return json({ error: 'Pedido no encontrado' }, 404);

    const copy = STATUS_COPY[order.status];
    if (!copy) return json({ sent: false, reason: 'Este estado no envía correo' });

    const shipping = (order.shipping_address ?? {}) as { name?: string; email?: string };
    let to = shipping.email;
    if (!to) {
      // Orders created before the email was stored with the order
      const { data } = await supabase.auth.admin.getUserById(order.user_id);
      to = data.user?.email ?? undefined;
    }
    if (!to) return json({ sent: false, reason: 'El cliente no tiene correo' });

    const biz = await loadBusinessInfo(supabase);
    const store = biz.nombre_comercial || 'Belia';
    const siteUrl = req.headers.get('origin') ?? DEFAULT_SITE_URL;
    const number = String(order.id).split('-')[0].toUpperCase();
    const tracking = (order.tracking_info as { text?: string } | null)?.text?.trim();
    const firstName = shipping.name ? `, ${esc(shipping.name.split(' ')[0])}` : '';

    const body = `
      <p style="font-size:14px;line-height:1.5">Hola${firstName}. ${copy.text.replaceAll('{n}', number)}</p>
      ${order.status === 'Enviado' && tracking ? `<p style="font-size:14px;line-height:1.5;background:#FFF0F3;padding:12px 16px;border-radius:10px"><strong>Guía de envío:</strong> ${esc(tracking)}</p>` : ''}
      <p style="margin:24px 0 0"><a href="${esc(siteUrl)}/pedido/${order.id}" style="background:#F6423C;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;font-size:14px;display:inline-block">Ver mi pedido</a></p>`;

    const sent = await sendMail(store, to, copy.subject.replaceAll('{n}', number), emailLayout(biz, copy.title, body));
    return json({ sent, reason: sent ? undefined : 'Faltan los secrets de Gmail en Supabase' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('notify-order-status error:', message);
    return json({ error: message }, 500);
  }
});
