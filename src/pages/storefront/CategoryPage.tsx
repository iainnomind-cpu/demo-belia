import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { ProductCard } from '../../components/catalog/ProductCard';
import { FiltersSidebar } from '../../components/catalog/FiltersSidebar';
import type { SupplierProduct } from '../../types/database';

type ViewMode = 'grid' | 'list';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

function ProductSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl border border-divider p-4 flex gap-4 animate-pulse">
        <div className="w-24 h-24 rounded-lg bg-surface-container-low flex-shrink-0" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-3 bg-surface-container-low rounded-full w-1/4" />
          <div className="h-4 bg-surface-container rounded-full w-3/4" />
          <div className="h-3 bg-surface-container-low rounded-full w-1/2" />
        </div>
        <div className="w-20 h-8 rounded-full bg-surface-container-low self-center" />
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-divider overflow-hidden animate-pulse">
      <div className="aspect-square bg-surface-container-low" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-surface-container-low rounded-full w-1/3" />
        <div className="h-4 bg-surface-container rounded-full w-4/5" />
        <div className="h-4 bg-surface-container-low rounded-full w-3/5" />
        <div className="flex justify-between pt-2">
          <div className="h-5 bg-surface-container-high rounded-full w-1/3" />
          <div className="w-9 h-9 rounded-full bg-surface-container-low" />
        </div>
      </div>
    </div>
  );
}

/**
 * CategoryPage — Premium PLP with sidebar filters, grid/list toggle, infinite scroll.
 * Supports slug-based routing + search query param.
 * Max 3 clicks validated: home → header nav → this page.
 */
export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const promoOnly = searchParams.get('promo') === 'true';

  const { categories, loading: catsLoading } = useCategories();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const category = categories.find(c => c.slug === slug);
  const categoryId = slug === 'todos' ? undefined : category?.id;

  const { products, loading, loadingMore, hasMore, loadMore, filters, setFilters } = useProducts({
    categoryId,
    searchQuery: query ?? undefined,
  });

  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Sync filters when route changes
  useEffect(() => {
    setFilters({ ...filters, categoryId, searchQuery: query ?? undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, query]);

  // Supplier prices
  useEffect(() => {
    if (user?.role === 'proveedor' || user?.role === 'admin') {
      const fetchSupplierPrices = async () => {
        const { data } = await (supabase.rpc as Function)('get_supplier_products', { category_id: categoryId });
        if (data) setSupplierProducts(data);
      };
      void fetchSupplierPrices();
    }
  }, [user, categoryId]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && hasMore && !loading && !loadingMore) loadMore();
      },
      { threshold: 0.5 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  const displayProducts = products.map(p => {
    const sp = supplierProducts.find(s => s.id === p.id);
    return { ...p, supplierPrice: sp?.price_proveedor };
  });

  const filteredProducts = promoOnly
    ? displayProducts.filter(p => !!p.price_promo)
    : displayProducts;

  const uniqueBrands = useMemo(
    () => Array.from(new Set(products.map(p => p.brand).filter(Boolean) as string[])).sort(),
    [products]
  );

  const categoryName = slug === 'todos'
    ? (query ? `Resultados para "${query}"` : promoOnly ? '🔥 Ofertas Especiales' : 'Todos los productos')
    : category?.name ?? (catsLoading ? '…' : 'Categoría');

  const hasActiveFilters = !!(filters.brand || filters.minPrice || filters.maxPrice);

  return (
    <div className="bg-belia-cream min-h-screen">

      {/* ─── Breadcrumb + Page header ───────────────────────────── */}
      <div className="bg-white border-b border-divider">
        <div className="container-belia py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[12px] text-text-meta mb-3" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-belia-red transition-colors">Inicio</Link>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            {slug !== 'todos' && (
              <>
                <Link to="/categoria/todos" className="hover:text-belia-red transition-colors">Catálogo</Link>
                <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              </>
            )}
            <span className="text-text-secondary font-medium">{categoryName}</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="section-title">{categoryName}</h1>
              <p className="text-sm text-text-meta mt-1.5">
                {loading ? 'Cargando…' : `${filteredProducts.length} producto${filteredProducts.length !== 1 ? 's' : ''}`}
                {hasActiveFilters && (
                  <span className="ml-2 text-belia-red font-semibold">· Filtros activos</span>
                )}
              </p>
            </div>

            {/* View mode + mobile filter btn */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-4 py-2 rounded-full border border-divider bg-white text-sm font-semibold text-text-secondary hover:border-belia-coral hover:text-belia-red transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                Filtros
                {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-belia-red" />}
              </button>

              <div className="hidden sm:flex items-center gap-1 bg-surface-container-low rounded-full p-1 border border-divider">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white text-belia-red shadow-belia-sm' : 'text-text-meta hover:text-text-secondary'}`}
                  aria-label="Vista cuadrícula"
                >
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-full transition-all ${viewMode === 'list' ? 'bg-white text-belia-red shadow-belia-sm' : 'text-text-meta hover:text-text-secondary'}`}
                  aria-label="Vista lista"
                >
                  <span className="material-symbols-outlined text-[18px]">view_list</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main layout: sidebar + grid ────────────────────────── */}
      <div className="container-belia py-8 flex flex-col lg:flex-row gap-8">

        {/* Sidebar desktop */}
        <div className="hidden lg:block">
          <FiltersSidebar
            brands={uniqueBrands}
            currentFilters={filters}
            onFilterChange={setFilters}
          />
        </div>

        {/* ─── Product area ──────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Loading state */}
          {loading && filteredProducts.length === 0 && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={viewMode === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5'
                : 'flex flex-col gap-3'
              }
            >
              {Array.from({ length: 9 }).map((_, i) => (
                <motion.div key={i} variants={itemVariants}>
                  <ProductSkeleton viewMode={viewMode} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Empty state */}
          {!loading && filteredProducts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <span className="text-6xl mb-4" role="img" aria-label="Sin resultados">🔍</span>
              <h3 className="text-xl font-bold text-belia-charcoal mb-2">Sin resultados</h3>
              <p className="text-text-secondary text-sm max-w-xs">
                Intenta ajustando los filtros o explora otra categoría.
              </p>
              <button
                onClick={() => setFilters({})}
                className="btn-primary text-sm mt-6"
              >
                Limpiar filtros
              </button>
            </motion.div>
          )}

          {/* Product grid */}
          {filteredProducts.length > 0 && (
            <motion.div
              key={viewMode}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={viewMode === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5'
                : 'flex flex-col gap-3'
              }
            >
              {filteredProducts.map(product => (
                <motion.div key={product.id} variants={itemVariants}>
                  <ProductCard product={product} supplierPrice={product.supplierPrice} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Infinite scroll trigger */}
          <div ref={observerTarget} className="flex justify-center items-center h-16 mt-6">
            {loadingMore && (
              <div className="flex items-center gap-2 text-text-meta text-sm">
                <div className="w-5 h-5 border-2 border-belia-coral border-t-transparent rounded-full animate-spin" />
                Cargando más productos…
              </div>
            )}
            {!hasMore && filteredProducts.length > 0 && (
              <p className="text-text-meta text-xs font-medium">
                ✓ Mostrando todos los productos
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Mobile filter drawer ────────────────────────────────── */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="absolute right-0 top-0 h-full w-[85vw] max-w-sm bg-white shadow-mega-menu flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-divider">
              <h2 className="font-bold text-belia-charcoal flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-belia-red">tune</span>
                Filtros
              </h2>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 rounded-full hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] text-text-secondary">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <FiltersSidebar
                brands={uniqueBrands}
                currentFilters={filters}
                onFilterChange={(f) => { setFilters(f); setMobileFiltersOpen(false); }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
