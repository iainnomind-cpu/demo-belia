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
// Stock for NEW products whose Stock cell is empty (existing products keep theirs)
const DEFAULT_STOCK_WHEN_EMPTY = Number(Deno.env.get('DEFAULT_STOCK_WHEN_EMPTY') ?? '100');

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

// Columns of PLANTILLA BELIA are found by their header (row 1), so columns can
// be moved or added. Default positions are used when a header is not found:
// A Código | B Título | C Descripción | D Stock | E Precio | F Promoción
// G Marca | H Categoría | I Subcategoría | J-L URL_Imagen_01..03
// Optional columns (only read when their header exists):
//   "Activo" (SI/NO) · "Categorías adicionales" (e.g. "PROFESIONALES / WAXERS; MEN'S CARE / SKINCARE")
const COLUMNS = {
  sku:         { index: 0,  headers: ['codigo', 'sku', 'clave'] },
  name:        { index: 1,  headers: ['titulo', 'nombre', 'producto'] },
  description: { index: 2,  headers: ['descripcion'] },
  stock:       { index: 3,  headers: ['stock', 'existencia', 'existencias', 'inventario'] },
  price:       { index: 4,  headers: ['precio', 'preciopublico'] },
  promo:       { index: 5,  headers: ['promocion', 'preciopromo', 'promo'] },
  brand:       { index: 6,  headers: ['marca'] },
  category:    { index: 7,  headers: ['categoria'] },
  subcategory: { index: 8,  headers: ['subcategoria'] },
  img1:        { index: 9,  headers: ['urlimagen01', 'urlimagen1', 'imagen1', 'imagen'] },
  img2:        { index: 10, headers: ['urlimagen02', 'urlimagen2', 'imagen2'] },
  img3:        { index: 11, headers: ['urlimagen03', 'urlimagen3', 'imagen3'] },
  active:      { index: -1, headers: ['activo', 'activa', 'visible', 'publicado', 'estado'] },
  extra:       { index: -1, headers: ['categoriasadicionales', 'categoriaadicional', 'categoriasextra', 'otrascategorias'] },
} as const;
type ColumnKey = keyof typeof COLUMNS;

interface SheetRow {
  sku: string;
  name: string;
  description: string | null;
  brand: string | null;
  category_id: string | null;
  extra_category_ids: string[];
  price_publico: number;
  price_promo: number | null;
  stock: number | null;        // null = empty cell: keep current stock
  is_active: boolean | null;   // null = empty/missing "Activo" cell: keep current state
  image_url: string | null;
}

type ExistingProduct = Omit<SheetRow, 'stock' | 'is_active'> & {
  id: string; stock: number; is_active: boolean; source: string;
};

const COMPARED_FIELDS = [
  'name', 'description', 'brand', 'category_id', 'price_publico', 'price_promo', 'stock', 'image_url', 'is_active',
] as const;

// "$ 1,234.50" → 1234.5 ; "" / "#N/D" → null
function parseMoney(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

// "" → null (keep current stock) ; "12" → 12 ; "-3" → 0
function parseStock(value: string | undefined): number | null {
  const cleaned = (value ?? '').replace(/[^0-9-]/g, '');
  if (!cleaned) return null;
  return Math.max(0, parseInt(cleaned, 10) || 0);
}

// "SI" / "NO" / "1" / "0" / "TRUE" … → boolean ; empty or unknown → null
function parseActive(value: string | undefined): boolean | null {
  const v = normalizeName(value ?? '');
  if (!v) return null;
  if (['si', 's', '1', 'true', 'verdadero', 'activo', 'activa', 'x', 'yes'].includes(v)) return true;
  if (['no', 'n', '0', 'false', 'falso', 'inactivo', 'inactiva'].includes(v)) return false;
  return null;
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

// "URL_Imagen_01" → "urlimagen01" (headers are compared without spaces/symbols)
const headerKey = (value: string) => normalizeName(value).replace(/[^a-z0-9]/g, '');

// "Peinado y Estilizado" → "peinado-y-estilizado"
function slugify(value: string): string {
  return normalizeName(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// "SHAMPOOS Y ACONDICIONADORES" → "Shampoos y Acondicionadores"
const SMALL_WORDS = new Set(['y', 'e', 'o', 'u', 'a', 'de', 'del', 'la', 'las', 'el', 'los', 'en', 'con', 'para']);
function toTitle(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim().split(' ')
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

// Rejects junk like "0" or "-" that would otherwise become a category
function isValidCategoryName(value: string): boolean {
  return /[a-z]{2}/.test(normalizeName(value));
}

// Edit distance, used to absorb typos like "ESTILIZDO" or "MAQUINA" vs "Máquinas"
function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// Closest existing name within a small typo tolerance (1 edit for short names, 2 for long ones)
function closestName(target: string, candidates: string[]): string | null {
  const compact = (s: string) => s.replace(/[^a-z0-9]/g, '');
  const t = compact(target);
  const maxDistance = t.length >= 10 ? 2 : t.length >= 5 ? 1 : 0;
  let best: { name: string; d: number } | null = null;
  for (const c of candidates) {
    const d = levenshtein(t, compact(c));
    if (d <= maxDistance && (!best || d < best.d)) best = { name: c, d };
  }
  return best?.name ?? null;
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

  if (authError || !user || user.app_metadata?.role !== 'admin') {
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
    // ── 1. Fetch sheet data (row 1 = headers) ────────────────
    const range = encodeURIComponent(`'${GOOGLE_SHEET_TAB}'!A1:Z`);
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${range}?key=${GOOGLE_SHEETS_API_KEY}`;
    const sheetRes = await fetch(sheetUrl);

    if (!sheetRes.ok) {
      const detail = await sheetRes.json().catch(() => null) as { error?: { message?: string } } | null;
      throw new Error(`Google Sheets API error ${sheetRes.status}: ${detail?.error?.message ?? sheetRes.statusText}`);
    }

    const sheetData = await sheetRes.json() as { values?: string[][] };
    const [headerRow = [], ...rows] = sheetData.values ?? [];

    const headerIndex = new Map(headerRow.map((h, i) => [headerKey(h ?? ''), i]));
    const col = {} as Record<ColumnKey, number>;
    for (const [key, def] of Object.entries(COLUMNS) as [ColumnKey, (typeof COLUMNS)[ColumnKey]][]) {
      const found = def.headers.map((h) => headerIndex.get(h)).find((i) => i !== undefined);
      col[key] = found ?? def.index;
    }
    const cell = (row: string[], key: ColumnKey) => (col[key] >= 0 ? row[col[key]] : undefined);

    // ── 2. Categories: the sheet is the source of truth ─────
    // Missing "Categoría / Subcategoría" pairs are created on confirm; in preview
    // they get placeholder ids so the diff still counts them as changes.
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, slug, parent_id, is_active');
    if (catError) throw new Error(`Categories fetch failed: ${catError.message}`);

    const parentByName = new Map<string, string>();
    const childByKey = new Map<string, string>(); // `${parentId}|${childName}`
    const childNames = new Map<string, string[]>(); // parentId → normalized child names
    const nameById = new Map<string, string>();
    const slugById = new Map<string, string>();
    const usedSlugs = new Set<string>();
    for (const c of categories ?? []) {
      nameById.set(c.id, c.name);
      slugById.set(c.id, c.slug);
      usedSlugs.add(c.slug);
      if (!c.parent_id) {
        parentByName.set(normalizeName(c.name), c.id);
      } else {
        childByKey.set(`${c.parent_id}|${normalizeName(c.name)}`, c.id);
        childNames.set(c.parent_id, [...(childNames.get(c.parent_id) ?? []), normalizeName(c.name)]);
      }
    }

    const uniqueSlug = (base: string) => {
      let slug = base;
      for (let i = 2; usedSlugs.has(slug); i++) slug = `${base}-${i}`;
      usedSlugs.add(slug);
      return slug;
    };

    const newCategories = new Set<string>();
    const invalidCategories = new Set<string>();
    const approxMatches = new Set<string>(); // "PEINADO Y ESTILIZDO → Peinado y Estilizado"

    const createCategory = async (name: string, parentId: string | null, placeholderKey: string) => {
      const displayName = toTitle(name);
      newCategories.add(parentId ? `${nameById.get(parentId)} / ${displayName}` : displayName);
      if (!isConfirmed || parentId?.startsWith('new:')) return `new:${placeholderKey}`;
      const parentSlug = parentId ? slugById.get(parentId) : undefined;
      const slug = uniqueSlug(parentSlug ? `${parentSlug}-${slugify(name)}` : slugify(name));
      const { data, error } = await supabase
        .from('categories')
        .insert({ name: displayName, slug, parent_id: parentId, sort_order: 100, is_active: true })
        .select('id')
        .single();
      if (error || !data) throw new Error(`No se pudo crear la categoría "${displayName}": ${error?.message}`);
      nameById.set(data.id, displayName);
      slugById.set(data.id, slug);
      return data.id as string;
    };

    const resolveCategory = async (cat: string | null, sub: string | null): Promise<string | null> => {
      if (!cat) return null;
      if (!isValidCategoryName(cat)) {
        invalidCategories.add(sub ? `${cat} / ${sub}` : cat);
        return null;
      }
      const parentKey = normalizeName(cat);
      let parentId = parentByName.get(parentKey);
      if (!parentId) {
        const close = closestName(parentKey, [...parentByName.keys()]);
        if (close) {
          parentId = parentByName.get(close)!;
          approxMatches.add(`${cat} → ${nameById.get(parentId)}`);
          parentByName.set(parentKey, parentId);
        } else {
          parentId = await createCategory(cat, null, parentKey);
          nameById.set(parentId, toTitle(cat));
          parentByName.set(parentKey, parentId);
        }
      }
      if (!sub) return parentId;
      if (!isValidCategoryName(sub)) {
        invalidCategories.add(`${cat} / ${sub}`);
        return parentId;
      }
      const subKey = normalizeName(sub);
      const childKey = `${parentId}|${subKey}`;
      let childId = childByKey.get(childKey);
      if (!childId) {
        const close = closestName(subKey, childNames.get(parentId) ?? []);
        if (close) {
          childId = childByKey.get(`${parentId}|${close}`)!;
          approxMatches.add(`${cat} / ${sub} → ${nameById.get(parentId)} / ${nameById.get(childId)}`);
        } else {
          childId = await createCategory(sub, parentId, childKey);
          childNames.set(parentId, [...(childNames.get(parentId) ?? []), subKey]);
        }
        childByKey.set(childKey, childId);
      }
      return childId;
    };

    // "PROFESIONALES / WAXERS; MEN'S CARE / SKINCARE" → category ids
    const resolveExtraCategories = async (value: string | undefined, mainId: string | null) => {
      const ids: string[] = [];
      for (const part of (cleanText(value) ?? '').split(/[;\n|]+/)) {
        if (!part.trim()) continue;
        const [cat, ...rest] = part.split('/');
        const id = await resolveCategory(cleanText(cat), cleanText(rest.join('/')));
        if (id && id !== mainId && !ids.includes(id)) ids.push(id);
      }
      return ids;
    };

    // ── 3. Parse rows, detect duplicate SKUs ─────────────────
    const skuCounts: Record<string, number> = {};
    const parsedRows: SheetRow[] = [];
    const invalidRows: string[] = [];

    for (const row of rows) {
      const sku = cell(row, 'sku')?.trim();
      if (!sku) continue;

      skuCounts[sku] = (skuCounts[sku] ?? 0) + 1;
      if (skuCounts[sku] > 1) continue; // Skip duplicates (take first occurrence)

      const name = cleanText(cell(row, 'name'));
      const pricePublico = parseMoney(cell(row, 'price'));
      if (!name || pricePublico === null) {
        invalidRows.push(sku);
        continue;
      }

      const images = [cell(row, 'img1'), cell(row, 'img2'), cell(row, 'img3')].map(normalizeImageUrl);
      const categoryId = await resolveCategory(cleanText(cell(row, 'category')), cleanText(cell(row, 'subcategory')));

      parsedRows.push({
        sku,
        name,
        description: cleanText(cell(row, 'description')),
        brand: cleanText(cell(row, 'brand')),
        category_id: categoryId,
        extra_category_ids: await resolveExtraCategories(cell(row, 'extra'), categoryId),
        price_publico: pricePublico,
        price_promo: parseMoney(cell(row, 'promo')),
        stock: parseStock(cell(row, 'stock')),
        is_active: parseActive(cell(row, 'active')),
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
        .select('id, sku, name, description, brand, category_id, extra_category_ids, price_publico, price_promo, stock, image_url, is_active, source')
        .range(from, from + PAGE - 1);
      if (error) {
        if (error.message.includes('extra_category_ids')) {
          throw new Error('Falta ejecutar la migración 0007_extra_categories.sql en Supabase (SQL Editor).');
        }
        throw new Error(`Products fetch failed: ${error.message}`);
      }
      existingProducts.push(...(data as ExistingProduct[]));
      if (!data || data.length < PAGE) break;
    }

    const existingBySku = new Map(existingProducts.map((p) => [p.sku, p]));
    const sheetSkus = new Set(parsedRows.map((r) => r.sku));

    // ── 5. Build diff ─────────────────────────────────────────
    const toInsert: SheetRow[] = [];
    const toUpdate: SheetRow[] = [];
    const manualSkipped: string[] = [];
    const sameIds = (a: string[] = [], b: string[] = []) => [...a].sort().join() === [...b].sort().join();

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
      const changed = !sameIds(existing.extra_category_ids, row.extra_category_ids) || COMPARED_FIELDS.some((f) => {
        if ((f === 'stock' || f === 'is_active') && row[f] === null) return false; // empty cell: keep current
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

    // Final visibility of each sheet row (the storefront only shows active products with a photo)
    const willBeActive = (r: SheetRow) => r.is_active ?? existingBySku.get(r.sku)?.is_active ?? true;
    const visibleRows = parsedRows.filter((r) => willBeActive(r) && r.image_url && existingBySku.get(r.sku)?.source !== 'manual');

    // Categories follow the sheet: active only if a visible product (sheet or manual)
    // uses them — directly, as an extra category, or through a subcategory.
    const parentOf = new Map((categories ?? []).map((c) => [c.id, c.parent_id as string | null]));
    const keepCategoryIds = new Set<string>();
    const keepWithParent = (id: string | null) => {
      if (!id || id.startsWith('new:')) return;
      keepCategoryIds.add(id);
      const parent = parentOf.get(id);
      if (parent) keepCategoryIds.add(parent);
    };
    visibleRows.forEach((r) => { keepWithParent(r.category_id); r.extra_category_ids.forEach(keepWithParent); });
    existingProducts
      .filter((p) => p.source === 'manual' && p.is_active && p.image_url)
      .forEach((p) => { keepWithParent(p.category_id); (p.extra_category_ids ?? []).forEach(keepWithParent); });

    const categoriesToDeactivate = (categories ?? []).filter((c) => c.is_active && !keepCategoryIds.has(c.id));
    const categoriesToActivate = (categories ?? []).filter((c) => !c.is_active && keepCategoryIds.has(c.id));

    const warnings = {
      skuConflicts,
      invalidRows, // SKUs without name or price
      newCategories: [...newCategories],
      approxMatches: [...approxMatches],
      invalidCategories: [...invalidCategories],
      categoriesDeactivated: categoriesToDeactivate.map((c) => c.name),
      manualSkipped,
    };
    const stats = {
      totalRows: parsedRows.length,
      visible: visibleRows.length,
      hiddenNoImage: parsedRows.filter((r) => willBeActive(r) && !r.image_url).length,
      hiddenInactive: parsedRows.filter((r) => !willBeActive(r)).length,
      activeColumn: col.active >= 0,
      extraColumn: col.extra >= 0,
    };

    // ── 6. Preview mode: return diff without applying ─────────
    if (!isConfirmed) {
      return json({
        preview: true,
        ...stats,
        toInsert: toInsert.length,
        toUpdate: toUpdate.length,
        toDeactivate: toDeactivate.length,
        ...warnings,
        sample: toInsert.slice(0, 5),
      });
    }

    // ── 7. Apply diff ─────────────────────────────────────────
    // Upsert by SKU only writes the sheet-managed columns, so price_proveedor
    // and featured_label edited in the admin are preserved. Empty Stock/Activo
    // cells leave the column out, so the current value is kept.
    const toPayload = (r: SheetRow, isNew: boolean) => {
      const { stock, is_active, ...rest } = r;
      const payload: Record<string, unknown> = { ...rest, source: 'sheet' };
      if (stock !== null || isNew) payload.stock = stock ?? DEFAULT_STOCK_WHEN_EMPTY;
      if (is_active !== null || isNew) payload.is_active = is_active ?? true;
      return payload;
    };

    // Each upsert batch must have the same columns → group rows by their column set
    const batches = new Map<string, Record<string, unknown>[]>();
    for (const payload of [...toInsert.map((r) => toPayload(r, true)), ...toUpdate.map((r) => toPayload(r, false))]) {
      const key = Object.keys(payload).sort().join(',');
      batches.set(key, [...(batches.get(key) ?? []), payload]);
    }

    const CHUNK = 500;
    for (const batch of batches.values()) {
      for (let i = 0; i < batch.length; i += CHUNK) {
        const { error } = await supabase
          .from('products')
          .upsert(batch.slice(i, i + CHUNK), { onConflict: 'sku' });
        if (error) throw new Error(`Upsert failed: ${error.message}`);
      }
    }

    // Deactivations (SOFT DELETE only — FR-018)
    for (let i = 0; i < toDeactivate.length; i += CHUNK) {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .in('id', toDeactivate.slice(i, i + CHUNK));
      if (error) throw new Error(`Deactivation failed: ${error.message}`);
    }

    if (categoriesToDeactivate.length > 0) {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: false })
        .in('id', categoriesToDeactivate.map((c) => c.id));
      if (error) throw new Error(`Category deactivation failed: ${error.message}`);
    }
    if (categoriesToActivate.length > 0) {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: true })
        .in('id', categoriesToActivate.map((c) => c.id));
      if (error) throw new Error(`Category activation failed: ${error.message}`);
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
      ...stats,
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
