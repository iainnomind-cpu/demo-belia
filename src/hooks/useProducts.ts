import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types/database';

const PAGE_SIZE = 24; // FR-025: Infinite scroll with batches of 24

interface ProductFilters {
  categoryId?: string;
  /** Category plus its subcategories; takes precedence over categoryId */
  categoryIds?: string[];
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  searchQuery?: string;
  featuredOnly?: boolean;
}

interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  filters: ProductFilters;
  setFilters: (filters: ProductFilters | ((prev: ProductFilters) => ProductFilters)) => void;
}

/**
 * useProducts — Fetches active products with infinite scroll (FR-025).
 * price_proveedor is NEVER selected here — only get_supplier_products() RPC returns it.
 * Filters are applied server-side for performance.
 */
export function useProducts(
  initialFilters: ProductFilters = {},
  /** enabled=false waits (e.g. until the category of the URL is known) instead of loading all products */
  { enabled = true }: { enabled?: boolean } = {},
): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  // Each new filter set gets a request id; responses from older requests are ignored
  // (otherwise a slow "all products" response could overwrite a category's products).
  const requestId = useRef(0);
  // Extra categories need SELECT on products.extra_category_ids (migration 0007/0009).
  // If that permission is missing, fall back to the main category instead of failing.
  const [extraCategories, setExtraCategories] = useState(true);

  const buildQuery = useCallback((currentOffset: number) => {
    // IMPORTANT: price_proveedor is intentionally NOT selected here.
    let query = supabase
      .from('products')
      .select('id, sku, name, description, category_id, brand, price_publico, price_promo, stock, image_url, featured_label, is_active, source, created_at, updated_at')
      .eq('is_active', true)
      // Products without a photo are never shown in the store
      .filter('image_url', 'not.is', null)
      // A stable order is required for range() pagination; without it pages can repeat or skip rows
      .order('created_at', { ascending: false })
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(currentOffset, currentOffset + PAGE_SIZE - 1);

    if (filters.featuredOnly) {
      query = query.not('featured_label', 'is', null);
    }

    // The search box is independent: a search looks in the whole catalog
    const term = filters.searchQuery?.replace(/[,()*%\\{}"]/g, ' ').trim();
    const categoryIds = filters.categoryIds?.length ? filters.categoryIds : filters.categoryId ? [filters.categoryId] : [];
    if (!term && categoryIds.length) {
      // Main category OR any of the extra categories (e.g. Profesionales / Waxers)
      const list = categoryIds.join(',');
      query = extraCategories
        ? query.or(`category_id.in.(${list}),extra_category_ids.ov.{${list}}`)
        : query.in('category_id', categoryIds);
    }
    if (filters.brand) {
      query = query.eq('brand', filters.brand);
    }
    if (filters.minPrice !== undefined) {
      query = query.gte('price_publico', filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      query = query.lte('price_publico', filters.maxPrice);
    }
    if (term) {
      // Commas, parentheses and wildcards (stripped above) would break the PostgREST or() syntax
      query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%,sku.ilike.%${term}%`);
    }

    return query;
  }, [filters, extraCategories]);

  const isPermissionError = (e: { code?: string; message?: string }) =>
    e.code === '42501' || /permission denied/i.test(e.message ?? '');

  // Reset when filters change
  useEffect(() => {
    const id = ++requestId.current;
    setProducts([]);
    setOffset(0);
    setHasMore(true);
    setLoading(true);
    setError(null);
    if (!enabled) return;

    const fetchInitial = async () => {
      const { data, error: fetchError } = await buildQuery(0);
      if (id !== requestId.current) return; // A newer request is in flight
      if (fetchError) {
        if (extraCategories && isPermissionError(fetchError)) {
          setExtraCategories(false); // Retries automatically without extra categories
          return;
        }
        setError(fetchError.message);
        setHasMore(false); // Stops the infinite scroll from retrying forever
      } else {
        setProducts(data ?? []);
        setHasMore((data?.length ?? 0) === PAGE_SIZE);
        setOffset(PAGE_SIZE);
      }
      setLoading(false);
    };

    void fetchInitial();
  }, [filters, buildQuery, enabled, extraCategories]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || !enabled) return;

    const id = requestId.current;
    setLoadingMore(true);
    const fetchMore = async () => {
      const { data, error: fetchError } = await buildQuery(offset);
      if (id !== requestId.current) return;
      if (fetchError) {
        setError(fetchError.message);
        setHasMore(false);
      } else {
        setProducts((prev) => [...prev, ...(data ?? [])]);
        setHasMore((data?.length ?? 0) === PAGE_SIZE);
        setOffset((prev) => prev + PAGE_SIZE);
      }
      setLoadingMore(false);
    };

    void fetchMore();
  }, [loadingMore, hasMore, offset, buildQuery, enabled]);

  const updateFilters = useCallback(
    (newFilters: ProductFilters | ((prev: ProductFilters) => ProductFilters)) => {
      setFilters(newFilters);
    },
    []
  );

  return { products, loading, loadingMore, hasMore, error, loadMore, filters, setFilters: updateFilters };
}
