import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { ProductCard } from '../../components/catalog/ProductCard';
import { FiltersSidebar } from '../../components/catalog/FiltersSidebar';
import type { SupplierProduct } from '../../types/database';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');

  const { categories, loading: catsLoading } = useCategories();
  const { user } = useAuth();
  
  // Find category id by slug
  const category = categories.find(c => c.slug === slug);
  const categoryId = slug === 'todos' ? undefined : category?.id;

  // Products hook with infinite scroll
  const { 
    products, 
    loading, 
    loadingMore, 
    hasMore, 
    loadMore, 
    filters, 
    setFilters 
  } = useProducts({ 
    categoryId,
    searchQuery: query || undefined
  });

  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  
  // Update categoryId filter when route changes
  useEffect(() => {
    setFilters({ ...filters, categoryId, searchQuery: query || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, query]);

  // Fetch supplier prices if needed
  useEffect(() => {
    if (user?.role === 'proveedor' || user?.role === 'admin') {
      const fetchSupplierPrices = async () => {
        const { data } = await supabase.rpc('get_supplier_products', { p_category_id: categoryId });
        if (data) setSupplierProducts(data);
      };
      void fetchSupplierPrices();
    }
  }, [user, categoryId]);

  // Intersection Observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  // Merge supplier prices and extract unique brands for filters
  const displayProducts = products.map(p => {
    const sp = supplierProducts.find(s => s.id === p.id);
    return { ...p, supplierPrice: sp?.price_proveedor };
  });

  const uniqueBrands = useMemo(() => {
    const brands = new Set(products.map(p => p.brand).filter(Boolean) as string[]);
    return Array.from(brands).sort();
  }, [products]);

  const categoryName = slug === 'todos' ? (query ? `Resultados para "${query}"` : 'Todos los productos') : category?.name || 'Cargando...';

  return (
    <div className="bg-surface-bright min-h-screen pb-16">
      {/* Category Header */}
      <div className="bg-white border-b border-divider py-8 mb-8">
        <div className="max-w-7xl mx-auto px-margin">
          <h1 className="font-headline-lg text-3xl font-bold text-text-primary">
            {catsLoading ? '...' : categoryName}
          </h1>
          <p className="text-sm text-text-meta mt-2">
            Mostrando {displayProducts.length} productos
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-margin flex flex-col lg:flex-row gap-8">
        <FiltersSidebar 
          brands={uniqueBrands}
          currentFilters={filters}
          onFilterChange={setFilters}
        />

        <div className="flex-1">
          {loading && products.length === 0 ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin h-10 w-10 border-t-4 border-belia-red rounded-full"></div>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="bg-white rounded-xl border border-divider p-12 text-center">
              <span className="material-symbols-outlined text-6xl text-text-meta opacity-50 mb-4">inventory_2</span>
              <h3 className="text-xl font-bold text-text-primary mb-2">No encontramos productos</h3>
              <p className="text-text-secondary">Intenta ajustando los filtros o buscando otra categoría.</p>
              <button 
                onClick={() => setFilters({})} 
                className="mt-6 text-belia-red font-bold hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-gutter">
                {displayProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    supplierPrice={product.supplierPrice} 
                  />
                ))}
              </div>
              
              {/* Infinite scroll trigger target */}
              <div ref={observerTarget} className="h-20 flex justify-center items-center mt-8">
                {loadingMore && (
                  <div className="animate-spin h-8 w-8 border-t-2 border-belia-red rounded-full"></div>
                )}
                {!hasMore && products.length > 0 && (
                  <p className="text-text-meta text-sm">Has llegado al final del catálogo.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
