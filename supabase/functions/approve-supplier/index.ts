// supabase/functions/approve-supplier/index.ts
// Belia — B2B Supplier Approval & User Creation
// This function creates the Supabase Auth user, updates the supplier status to 'aprobado',
// and sends a welcome email via Gmail SMTP.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GMAIL_USER = Deno.env.get('GMAIL_USER')!;
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')!;

serve(async (req) => {
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

  if (authError || !adminUser || adminUser.user_metadata?.role !== 'admin') {
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

    // 3. Generate a secure random password for initial login
    const tempPassword = crypto.randomUUID().slice(0, 12) + 'Be!';

    // 4. Create Auth User
    const { data: authData, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: supplier.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: 'proveedor',
        company_name: supplier.company_name,
        contact_name: supplier.contact_name
      }
    });

    if (createAuthErr) {
      throw new Error(`Failed to create auth user: ${createAuthErr.message}`);
    }

    // 5. Update supplier status
    const { error: updateErr } = await supabaseAdmin
      .from('suppliers')
      .update({ status: 'aprobado' })
      .eq('id', supplierId);

    if (updateErr) {
      // Rollback auth user creation if db update fails
      if (authData.user) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      }
      throw new Error(`Failed to update supplier status: ${updateErr.message}`);
    }

    // 6. Send Email via SMTP
    const client = new SmtpClient();
    
    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: GMAIL_USER,
      password: GMAIL_APP_PASSWORD,
    });

    await client.send({
      from: `"Belia Premium Beauty" <${GMAIL_USER}>`,
      to: supplier.email,
      subject: "¡Bienvenido a la red de proveedores Belia!",
      content: "auto-generated",
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto;">
          <h1 style="color: #BA000D;">¡Hola ${supplier.contact_name}!</h1>
          <p>Nos complace informarte que tu solicitud para formar parte de la red de proveedores B2B de Belia ha sido <strong>aprobada</strong>.</p>
          <p>A partir de ahora, al iniciar sesión en nuestra plataforma, podrás ver y acceder a los precios preferenciales y promociones exclusivas para mayoristas.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Tus credenciales de acceso:</h3>
            <p><strong>Usuario:</strong> ${supplier.email}</p>
            <p><strong>Contraseña temporal:</strong> ${tempPassword}</p>
            <p style="font-size: 12px; color: #666;">Te recomendamos cambiar esta contraseña al ingresar por primera vez.</p>
          </div>
          
          <a href="https://belia-app.netlify.app/login" style="display: inline-block; background-color: #BA000D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Iniciar Sesión</a>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            Si tienes alguna duda, no dudes en responder a este correo.<br>
            El equipo de Belia.
          </p>
        </div>
      `,
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
