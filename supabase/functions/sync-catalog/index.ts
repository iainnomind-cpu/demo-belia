// supabase/functions/sync-catalog/index.ts
// Belia — Google Sheets Catalog Sync Edge Function
// SECURITY: Credentials live in environment variables only. No VITE_ prefix.
// This function is the ONLY place that calls Google Sheets API.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_SHEETS_API_KEY = Deno.env.get('GOOGLE_SHEETS_API_KEY');
const GOOGLE_SHEET_ID = Deno.env.get('GOOGLE_SHEET_ID');
const GOOGLE_SHEET_TAB = Deno.env.get('GOOGLE_SHEET_TAB') ?? 'PLANTILLA BELIA';

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

// Columns from PLANTILLA BELIA:
// A Código | B Título | C Descripción | D Stock | E Precio | F Promoción
// G Marca | H Categoría | I Subcategoría | J-L URL_Imagen_01..03
const COL = {
  sku: 0, name: 1, description: 2, stock: 3, price: 4, promo: 5,
  brand: 6, category: 7, subcategory: 8, img1: 9, img2: 10, img3: 11,
} as const;

interface SheetRow {
  sku: string;
  name: string;
  description: string | null;
  brand: string | null;
  category_id: string | null;
  price_publico: number;
  price_promo: number | null;
  stock: number;
  image_url: string | null;
}

type ExistingProduct = SheetRow & { id: string; is_active: boolean; source: string };

const SHEET_FIELDS = [
  'name', 'description', 'brand', 'category_id', 'price_publico', 'price_promo', 'stock', 'image_url',
] as const;

// "$ 1,234.50" → 1234.5 ; "" / "#N/D" → null
function parseMoney(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

// Treat spreadsheet error values (#N/D, #N/A, #REF!...) as empty
function cleanText(value: string | undefined): string | null {
  const v = value?.trim();
  if (!v || v.startsWith('#')) return null;
  return v;
}

// Dropbox share links (dl=0) return an HTML page; raw=1 serves the image itself
function normalizeImageUrl(value: string | undefined): string | null {
  const v = cleanText(value);
  if (!v) return null;
  try {
    const url = new URL(v);
    if (url.hostname.endsWith('dropbox.com')) {
      url.searchParams.delete('dl');
      url.searchParams.set('raw', '1');
    }
    return url.toString();
  } catch {
    return null;
  }
}

// "DEPILACIÓN" → "depilacion"
function normalizeName(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify caller is admin
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user || user.user_metadata?.role !== 'admin') {
    return json({ error: 'Forbidden: admin role required' }, 403);
  }

  if (!GOOGLE_SHEETS_API_KEY || !GOOGLE_SHEET_ID) {
    return json({ error: 'Faltan los secrets GOOGLE_SHEETS_API_KEY / GOOGLE_SHEET_ID en Supabase.' }, 500);
  }

  const body = await req.json().catch(() => ({})) as { confirmed?: boolean };
  const isConfirmed = body.confirmed === true;

  // Only real syncs are logged; previews don't leave 'en_progreso' entries behind
  let logId: string | undefined;
  if (isConfirmed) {
    const { data: syncLog } = await supabase
      .from('sync_logs')
      .insert({ status: 'en_progreso' })
      .select()
      .single();
    logId = syncLog?.id;
  }

  try {
    // ── 1. Fetch sheet data ──────────────────────────────────
    const range = encodeURIComponent(`'${GOOGLE_SHEET_TAB}'!A2:L`);
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${range}?key=${GOOGLE_SHEETS_API_KEY}`;
    const sheetRes = await fetch(sheetUrl);

    if (!sheetRes.ok) {
      const detail = await sheetRes.json().catch(() => null) as { error?: { message?: string } } | null;
      throw new Error(`Google Sheets API error ${sheetRes.status}: ${detail?.error?.message ?? sheetRes.statusText}`);
    }

    const sheetData = await sheetRes.json() as { values?: string[][] };
    const rows = sheetData.values ?? [];

    // ── 2. Load categories to map "Categoría / Subcategoría" → category_id
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, parent_id');
    if (catError) throw new Error(`Categories fetch failed: ${catError.message}`);

    const parentByName = new Map<string, string>();
    const childByKey = new Map<string, string>(); // `${parentId}|${childName}`
    for (const c of categories ?? []) {
      if (!c.parent_id) parentByName.set(normalizeName(c.name), c.id);
      else childByKey.set(`${c.parent_id}|${normalizeName(c.name)}`, c.id);
    }

    const unmatchedCategories = new Set<string>();
    const resolveCategory = (cat: string | null, sub: string | null): string | null => {
      if (!cat) return null;
      const parentId = parentByName.get(normalizeName(cat));
      if (!parentId) {
        unmatchedCategories.add(sub ? `${cat} / ${sub}` : cat);
        return null;
      }
      if (sub) {
        const childId = childByKey.get(`${parentId}|${normalizeName(sub)}`);
        if (childId) return childId;
        unmatchedCategories.add(`${cat} / ${sub}`);
      }
      return parentId;
    };

    // ── 3. Parse rows, detect duplicate SKUs ─────────────────
    const skuCounts: Record<string, number> = {};
    const parsedRows: SheetRow[] = [];
    const invalidRows: string[] = [];

    for (const row of rows) {
      const sku = row[COL.sku]?.trim();
      if (!sku) continue;

      skuCounts[sku] = (skuCounts[sku] ?? 0) + 1;
      if (skuCounts[sku] > 1) continue; // Skip duplicates (take first occurrence)

      const name = cleanText(row[COL.name]);
      const pricePublico = parseMoney(row[COL.price]);
      if (!name || pricePublico === null) {
        invalidRows.push(sku);
        continue;
      }

      const images = [row[COL.img1], row[COL.img2], row[COL.img3]].map(normalizeImageUrl);

      parsedRows.push({
        sku,
        name,
        description: cleanText(row[COL.description]),
        brand: cleanText(row[COL.brand]),
        category_id: resolveCategory(cleanText(row[COL.category]), cleanText(row[COL.subcategory])),
        price_publico: pricePublico,
        price_promo: parseMoney(row[COL.promo]),
        stock: Math.max(0, parseInt((row[COL.stock] ?? '').replace(/[^0-9-]/g, ''), 10) || 0),
        image_url: images.find((u) => u !== null) ?? null,
      });
    }

    const skuConflicts = Object.entries(skuCounts)
      .filter(([, count]) => count > 1)
      .map(([sku]) => sku);

    // ── 4. Load ALL existing products (paginated: PostgREST caps at 1000 rows)
    const existingProducts: ExistingProduct[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('products')
        .select('id, sku, name, description, brand, category_id, price_publico, price_promo, stock, image_url, is_active, source')
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`Products fetch failed: ${error.message}`);
      existingProducts.push(...(data as ExistingProduct[]));
      if (!data || data.length < PAGE) break;
    }

    const existingBySku = new Map(existingProducts.map((p) => [p.sku, p]));
    const sheetSkus = new Set(parsedRows.map((r) => r.sku));

    // ── 5. Build diff ─────────────────────────────────────────
    const toInsert: SheetRow[] = [];
    const toUpdate: SheetRow[] = [];
    const manualSkipped: string[] = [];

    for (const row of parsedRows) {
      const existing = existingBySku.get(row.sku);
      if (!existing) {
        toInsert.push(row);
        continue;
      }
      if (existing.source === 'manual') {
        manualSkipped.push(row.sku); // Never touch source='manual'
        continue;
      }
      const changed = !existing.is_active || SHEET_FIELDS.some((f) => {
        const a = existing[f] ?? null;
        const b = row[f] ?? null;
        // NUMERIC columns may come back as strings
        if (typeof b === 'number' && a !== null) return Number(a) !== b;
        return a !== b;
      });
      if (changed) toUpdate.push(row);
    }

    // Products in DB (source=sheet) but not in sheet anymore → deactivate
    const toDeactivate = existingProducts
      .filter((p) => p.source === 'sheet' && p.is_active && !sheetSkus.has(p.sku))
      .map((p) => p.id);

    const warnings = {
      skuConflicts,
      invalidRows, // SKUs without name or price
      unmatchedCategories: [...unmatchedCategories],
      manualSkipped,
    };

    // ── 6. Preview mode: return diff without applying ─────────
    if (!isConfirmed) {
      return json({
        preview: true,
        totalRows: parsedRows.length,
        toInsert: toInsert.length,
        toUpdate: toUpdate.length,
        toDeactivate: toDeactivate.length,
        ...warnings,
        sample: toInsert.slice(0, 5),
      });
    }

    // ── 7. Apply diff ─────────────────────────────────────────
    // Upsert by SKU only writes the sheet-managed columns, so price_proveedor
    // and featured_label edited in the admin are preserved.
    const upsertRows = [...toInsert, ...toUpdate].map((r) => ({ ...r, is_active: true, source: 'sheet' }));
    const CHUNK = 500;
    for (let i = 0; i < upsertRows.length; i += CHUNK) {
      const { error } = await supabase
        .from('products')
        .upsert(upsertRows.slice(i, i + CHUNK), { onConflict: 'sku' });
      if (error) throw new Error(`Upsert failed: ${error.message}`);
    }

    // Deactivations (SOFT DELETE only — FR-018)
    for (let i = 0; i < toDeactivate.length; i += CHUNK) {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .in('id', toDeactivate.slice(i, i + CHUNK));
      if (error) throw new Error(`Deactivation failed: ${error.message}`);
    }

    await supabase.from('sync_logs').update({
      status: 'completado',
      finished_at: new Date().toISOString(),
      inserted_count: toInsert.length,
      updated_count: toUpdate.length,
      deactivated_count: toDeactivate.length,
    }).eq('id', logId);

    return json({
      success: true,
      inserted: toInsert.length,
      updated: toUpdate.length,
      deactivated: toDeactivate.length,
      ...warnings,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (logId) {
      await supabase.from('sync_logs').update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: message,
      }).eq('id', logId);
    }

    return json({ error: message }, 500);
  }
});
