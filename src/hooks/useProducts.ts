import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types/database';

const PAGE_SIZE = 24; // FR-025: Infinite scroll with batches of 24

interface ProductFilters {
  categoryId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  searchQuery?: string;
}

interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  filters: ProductFilters;
  setFilters: (filters: ProductFilters) => void;
}

/**
 * useProducts — Fetches active products with infinite scroll (FR-025).
 * price_proveedor is NEVER selected here — only get_supplier_products() RPC returns it.
 * Filters are applied server-side for performance.
 */
export function useProducts(initialFilters: ProductFilters = {}): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);

  const buildQuery = useCallback((currentOffset: number) => {
    // IMPORTANT: price_proveedor is intentionally NOT selected here.
    let query = supabase
      .from('products')
      .select('id, sku, name, description, category_id, brand, price_publico, price_promo, stock, image_url, featured_label, is_active, source, created_at, updated_at')
      .eq('is_active', true)
      .range(currentOffset, currentOffset + PAGE_SIZE - 1);

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
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
    if (filters.searchQuery) {
      query = query.or(
        `name.ilike.%${filters.searchQuery}%,brand.ilike.%${filters.searchQuery}%,sku.ilike.%${filters.searchQuery}%`
      );
    }

    return query;
  }, [filters]);

  // Reset when filters change
  useEffect(() => {
    setProducts([]);
    setOffset(0);
    setHasMore(true);
    setLoading(true);

    const fetchInitial = async () => {
      const { data, error: fetchError } = await buildQuery(0);
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setProducts(data ?? []);
        setHasMore((data?.length ?? 0) === PAGE_SIZE);
        setOffset(PAGE_SIZE);
      }
      setLoading(false);
    };

    void fetchInitial();
  }, [filters, buildQuery]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const fetchMore = async () => {
      const { data, error: fetchError } = await buildQuery(offset);
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setProducts((prev) => [...prev, ...(data ?? [])]);
        setHasMore((data?.length ?? 0) === PAGE_SIZE);
        setOffset((prev) => prev + PAGE_SIZE);
      }
      setLoadingMore(false);
    };

    void fetchMore();
  }, [loadingMore, hasMore, offset, buildQuery]);

  const updateFilters = useCallback((newFilters: ProductFilters) => {
    setFilters(newFilters);
  }, []);

  return { products, loading, loadingMore, hasMore, error, loadMore, filters, setFilters: updateFilters };
}
