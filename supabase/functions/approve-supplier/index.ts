// supabase/functions/approve-supplier/index.ts
// Belia — B2B Supplier Approval & User Creation
// This function creates the Supabase Auth user, updates the supplier status to 'aprobado',
// and sends a welcome email via Gmail SMTP.

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const res = await handleRequest(req);
  for (const [k, v] of Object.entries(corsHeaders)) res.headers.set(k, v);
  return res;
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Verify caller is admin
  const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !adminUser || adminUser.app_metadata?.role !== 'admin') {
    return new Response('Forbidden: admin role required', { status: 403 });
  }

  try {
    const { supplierId } = await req.json();
    if (!supplierId) {
      return new Response('Missing supplierId', { status: 400 });
    }

    // 2. Fetch supplier details
    const { data: supplier, error: supplierErr } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single();

    if (supplierErr || !supplier) {
      throw new Error('Supplier not found');
    }

    if (supplier.status !== 'pendiente') {
      throw new Error('Supplier is not pending approval');
    }

    // 3. Create the account — or, if the professional already has a customer
    // account with this email, upgrade it to proveedor (createUser would fail).
    let tempPassword: string | null = crypto.randomUUID().slice(0, 12) + 'Be!';
    let createdUserId: string | null = null;

    const { data: authData, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: supplier.email,
      password: tempPassword,
      email_confirm: true,
      // Role in app_metadata: only the service role can change it
      app_metadata: { role: 'proveedor' },
      user_metadata: {
        company_name: supplier.company_name,
        contact_name: supplier.contact_name
      }
    });

    if (createAuthErr) {
      let existingId: string | null = null;
      for (let page = 1; page <= 20 && !existingId; page++) {
        const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        existingId = data.users.find((u) => u.email?.toLowerCase() === String(supplier.email).toLowerCase())?.id ?? null;
        if (data.users.length < 1000) break;
      }
      if (!existingId) {
        throw new Error(`Failed to create auth user: ${createAuthErr.message}`);
      }
      const { error: roleErr } = await supabaseAdmin.auth.admin.updateUserById(existingId, {
        app_metadata: { role: 'proveedor' },
      });
      if (roleErr) throw new Error(`Failed to update existing user: ${roleErr.message}`);
      tempPassword = null; // They keep their current password
    } else {
      createdUserId = authData.user?.id ?? null;
    }

    // 4. Update supplier status
    const { error: updateErr } = await supabaseAdmin
      .from('suppliers')
      .update({ status: 'aprobado' })
      .eq('id', supplierId);

    if (updateErr) {
      // Rollback auth user creation if db update fails
      if (createdUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      }
      throw new Error(`Failed to update supplier status: ${updateErr.message}`);
    }

    // 5. Welcome email. The account already exists at this point, so an email
    // failure must not look like a failed approval: the admin gets the
    // temporary password back to share it manually.
    const siteUrl = req.headers.get('origin') ?? DEFAULT_SITE_URL;
    try {
      const biz = await loadBusinessInfo(supabaseAdmin);
      const store = biz.nombre_comercial || 'Belia';
      const credentials = tempPassword
        ? `<div style="background:#FFF0F3;padding:16px 20px;border-radius:10px;margin:16px 0;font-size:14px;line-height:1.6">
             <strong>Tus datos de acceso</strong><br>
             Usuario: ${esc(supplier.email)}<br>
             Contraseña temporal: <strong>${esc(tempPassword)}</strong>
           </div>
           <p style="font-size:12px;color:#777">Te recomendamos cambiar tu contraseña al ingresar.</p>`
        : `<p style="font-size:14px;line-height:1.5">Inicia sesión con tu cuenta de siempre (${esc(supplier.email)}) para ver tus precios de profesional.</p>`;

      const sent = await sendMail(store, supplier.email, `¡Bienvenido a la red de profesionales ${store}!`, emailLayout(biz, `¡Hola, ${esc(supplier.contact_name)}!`, `
        <p style="font-size:14px;line-height:1.5">Tu solicitud para unirte a la red de profesionales de ${esc(store)} fue <strong>aprobada</strong>.
        Al iniciar sesión verás los precios preferenciales para mayoristas.</p>
        ${credentials}
        <p style="margin:24px 0 0"><a href="${esc(siteUrl)}/login" style="background:#F6423C;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;font-size:14px;display:inline-block">Iniciar sesión</a></p>`));
      if (!sent) throw new Error('Gmail secrets not set');
    } catch (mailErr) {
      console.error('Welcome email failed:', mailErr);
      return new Response(JSON.stringify({ success: true, emailSent: false, tempPassword }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, emailSent: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
