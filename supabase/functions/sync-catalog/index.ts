// supabase/functions/sync-catalog/index.ts
// Belia — Google Sheets Catalog Sync Edge Function
// SECURITY: Credentials live in environment variables only. No VITE_ prefix.
// This function is the ONLY place that calls Google Sheets API.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_SHEETS_API_KEY = Deno.env.get('GOOGLE_SHEETS_API_KEY')!;
const GOOGLE_SHEET_ID = Deno.env.get('GOOGLE_SHEET_ID')!;

// Columns from PLANTILLA BELIA (A–I confirmed)
interface SheetRow {
  sku: string;
  name: string;
  brand: string;
  category_name: string;
  price_publico: number;
  price_promo: number | null;
  descuento_proveedor_pct: number | null; // Column H: % discount for supplier price
  stock: number;
  featured_label: string | null; // Column I: e.g. "TOP 1", "TOP 2"
}

interface SyncDiff {
  toInsert: SheetRow[];
  toUpdate: Array<{ id: string; changes: Partial<SheetRow> }>;
  toDeactivate: string[]; // IDs of products to set active=false
  skuConflicts: string[]; // Duplicate SKUs in sheet
}

serve(async (req) => {
  // Only POST from authenticated admin
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify caller is admin
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user || user.user_metadata?.role !== 'admin') {
    return new Response('Forbidden: admin role required', { status: 403 });
  }

  const body = await req.json() as { confirmed?: boolean };
  const isConfirmed = body.confirmed === true;

  // Create sync log entry
  const { data: syncLog } = await supabase
    .from('sync_logs')
    .insert({ status: 'en_progreso' })
    .select()
    .single();

  const logId = syncLog?.id;

  try {
    // ── 1. Fetch sheet data ──────────────────────────────────
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/PLANTILLA BELIA!A2:I?key=${GOOGLE_SHEETS_API_KEY}`;
    const sheetRes = await fetch(sheetUrl);

    if (!sheetRes.ok) {
      throw new Error(`Google Sheets API error: ${sheetRes.status} ${sheetRes.statusText}`);
    }

    const sheetData = await sheetRes.json() as { values?: string[][] };
    const rows = sheetData.values ?? [];

    // ── 2. Parse rows, detect duplicate SKUs ─────────────────
    const skuCounts: Record<string, number> = {};
    const parsedRows: SheetRow[] = [];

    for (const row of rows) {
      const sku = row[0]?.trim();
      if (!sku) continue;

      skuCounts[sku] = (skuCounts[sku] ?? 0) + 1;
      if (skuCounts[sku] > 1) continue; // Skip duplicates (take first occurrence)

      const pricePublico = parseFloat(row[4]) || 0;
      const desctoPct = row[6] ? parseFloat(row[6]) : null;

      parsedRows.push({
        sku,
        name: row[1]?.trim() ?? '',
        brand: row[2]?.trim() ?? '',
        category_name: row[3]?.trim() ?? '',
        price_publico: pricePublico,
        price_promo: row[5] ? parseFloat(row[5]) : null,
        descuento_proveedor_pct: desctoPct,
        stock: parseInt(row[7] ?? '0', 10) || 0,
        featured_label: row[8]?.trim() || null,
      });
    }

    const skuConflicts = Object.entries(skuCounts)
      .filter(([, count]) => count > 1)
      .map(([sku]) => sku);

    // ── 3. Load existing products (source='sheet' only) ───────
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, sku, name, brand, price_publico, price_promo, price_proveedor, stock, featured_label, is_active, source')
      .eq('source', 'sheet'); // Never touch source='manual'

    const existingBySku = new Map(
      (existingProducts ?? []).map((p) => [p.sku, p])
    );
    const sheetSkus = new Set(parsedRows.map((r) => r.sku));

    // ── 4. Build diff ─────────────────────────────────────────
    const diff: SyncDiff = {
      toInsert: [],
      toUpdate: [],
      toDeactivate: [],
      skuConflicts,
    };

    for (const row of parsedRows) {
      const existing = existingBySku.get(row.sku);
      const priceProveedor = row.descuento_proveedor_pct !== null
        ? row.price_publico * (1 - row.descuento_proveedor_pct / 100)
        : null;

      if (!existing) {
        diff.toInsert.push({ ...row });
      } else {
        const changes: Record<string, unknown> = {};
        if (existing.name !== row.name) changes['name'] = row.name;
        if (existing.brand !== row.brand) changes['brand'] = row.brand;
        if (existing.price_publico !== row.price_publico) changes['price_publico'] = row.price_publico;
        if (existing.price_promo !== row.price_promo) changes['price_promo'] = row.price_promo;
        if (existing.price_proveedor !== priceProveedor) changes['price_proveedor'] = priceProveedor;
        if (existing.stock !== row.stock) changes['stock'] = row.stock;
        if (existing.featured_label !== row.featured_label) changes['featured_label'] = row.featured_label;
        if (!existing.is_active) changes['is_active'] = true; // Reactivate if back in sheet

        if (Object.keys(changes).length > 0) {
          diff.toUpdate.push({ id: existing.id, changes });
        }
      }
    }

    // Products in DB (source=sheet) but not in sheet anymore → deactivate
    for (const existing of existingProducts ?? []) {
      if (!sheetSkus.has(existing.sku) && existing.is_active) {
        diff.toDeactivate.push(existing.id);
      }
    }

    // ── 5. Preview mode: return diff without applying ─────────
    if (!isConfirmed) {
      return new Response(JSON.stringify({
        preview: true,
        toInsert: diff.toInsert.length,
        toUpdate: diff.toUpdate.length,
        toDeactivate: diff.toDeactivate.length,
        skuConflicts: diff.skuConflicts,
        details: diff,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── 6. Apply diff (atomic, no partial commits) ─────────────
    let insertedCount = 0;
    let updatedCount = 0;
    let deactivatedCount = 0;

    // Inserts
    if (diff.toInsert.length > 0) {
      const insertPayload = diff.toInsert.map((row) => ({
        sku: row.sku,
        name: row.name,
        brand: row.brand,
        price_publico: row.price_publico,
        price_promo: row.price_promo,
        price_proveedor: row.descuento_proveedor_pct !== null
          ? row.price_publico * (1 - row.descuento_proveedor_pct / 100)
          : null,
        stock: row.stock,
        featured_label: row.featured_label,
        is_active: true,
        source: 'sheet',
      }));

      const { error } = await supabase.from('products').insert(insertPayload);
      if (error) throw new Error(`Insert failed: ${error.message}`);
      insertedCount = diff.toInsert.length;
    }

    // Updates
    for (const { id, changes } of diff.toUpdate) {
      const { error } = await supabase.from('products').update(changes).eq('id', id);
      if (error) throw new Error(`Update failed for ${id}: ${error.message}`);
      updatedCount++;
    }

    // Deactivations (SOFT DELETE only — FR-018)
    if (diff.toDeactivate.length > 0) {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .in('id', diff.toDeactivate);
      if (error) throw new Error(`Deactivation failed: ${error.message}`);
      deactivatedCount = diff.toDeactivate.length;
    }

    // Update sync log
    await supabase.from('sync_logs').update({
      status: 'completado',
      finished_at: new Date().toISOString(),
      inserted_count: insertedCount,
      updated_count: updatedCount,
      deactivated_count: deactivatedCount,
    }).eq('id', logId);

    return new Response(JSON.stringify({
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      deactivated: deactivatedCount,
      skuConflicts: diff.skuConflicts,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Log the error — no partial changes remain
    if (logId) {
      await supabase.from('sync_logs').update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: message,
      }).eq('id', logId);
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
