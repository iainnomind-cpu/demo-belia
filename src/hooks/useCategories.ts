import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Category } from '../types/database';

interface CategoryTree extends Category {
  children: Category[];
}

interface UseCategoriesReturn {
  categories: Category[];
  categoryTree: CategoryTree[];
  loading: boolean;
  error: string | null;
}

/**
 * useCategories — Fetches active categories for the dynamic mega-menu.
 * Builds a nested tree structure for rendering parent → subcategory relationships.
 * All data comes from Supabase, never hardcoded.
 */
export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setCategories(data ?? []);
      }
      setLoading(false);
    }

    void fetchCategories();
  }, []);

  // Build parent → children tree
  const categoryTree: CategoryTree[] = categories
    .filter((c) => c.parent_id === null)
    .map((parent) => ({
      ...parent,
      children: categories.filter((c) => c.parent_id === parent.id),
    }));

  return { categories, categoryTree, loading, error };
}
