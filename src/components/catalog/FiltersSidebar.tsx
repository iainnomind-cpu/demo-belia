import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FiltersSidebarProps {
  brands: string[];
  currentFilters: {
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
  };
  onFilterChange: (filters: { brand?: string; minPrice?: number; maxPrice?: number }) => void;
}

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-divider pb-5 mb-5 last:border-0 last:mb-0 last:pb-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left group mb-3"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary group-hover:text-belia-red transition-colors">
          {title}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="material-symbols-outlined text-[16px] text-text-meta group-hover:text-belia-red"
        >
          expand_more
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * FiltersSidebar — Premium collapsible filter panel.
 * Brand checkboxes, price range inputs, clear-all.
 */
export function FiltersSidebar({ brands, currentFilters, onFilterChange }: FiltersSidebarProps) {
  const [minPriceStr, setMinPriceStr] = useState(currentFilters.minPrice?.toString() ?? '');
  const [maxPriceStr, setMaxPriceStr] = useState(currentFilters.maxPrice?.toString() ?? '');

  const hasActiveFilters = !!(currentFilters.brand || currentFilters.minPrice || currentFilters.maxPrice);

  const handleBrandChange = (brand: string) => {
    onFilterChange({
      ...currentFilters,
      brand: currentFilters.brand === brand ? undefined : brand,
    });
  };

  const handlePriceApply = () => {
    onFilterChange({
      ...currentFilters,
      minPrice: minPriceStr ? parseFloat(minPriceStr) : undefined,
      maxPrice: maxPriceStr ? parseFloat(maxPriceStr) : undefined,
    });
  };

  const handleClearAll = () => {
    setMinPriceStr('');
    setMaxPriceStr('');
    onFilterChange({});
  };

  return (
    <div className="w-full lg:w-60 xl:w-64 flex-shrink-0">
      <div className="bg-white rounded-2xl border border-divider p-6 sticky top-[88px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-belia-charcoal flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-belia-red">tune</span>
            Filtros
          </h2>
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="text-[11px] font-semibold text-belia-red hover:text-belia-coral transition-colors"
            >
              Limpiar todo
            </button>
          )}
        </div>

        {/* ─── Brand Filter ──────────────────────── */}
        {brands.length > 0 && (
          <FilterSection title="Marca">
            <div className="space-y-1.5 max-h-52 overflow-y-auto scroll-x-hidden pr-1">
              {brands.map((brand) => {
                const selected = currentFilters.brand === brand;
                return (
                  <label
                    key={brand}
                    className={`flex items-center gap-2.5 cursor-pointer py-1 px-2 rounded-lg transition-colors ${
                      selected ? 'bg-belia-blush' : 'hover:bg-surface-container-low'
                    }`}
                  >
                    {/* Custom checkbox */}
                    <span
                      className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        selected
                          ? 'bg-belia-red border-belia-red'
                          : 'border-outline bg-white hover:border-belia-coral'
                      }`}
                      onClick={() => handleBrandChange(brand)}
                    >
                      {selected && (
                        <span className="material-symbols-outlined text-white text-[11px]">check</span>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selected}
                      onChange={() => handleBrandChange(brand)}
                    />
                    <span className={`text-[13px] leading-tight ${selected ? 'font-semibold text-belia-red' : 'text-text-secondary'}`}>
                      {brand}
                    </span>
                  </label>
                );
              })}
            </div>
          </FilterSection>
        )}

        {/* ─── Price Range ───────────────────────── */}
        <FilterSection title="Precio (MXN)" defaultOpen={true}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-text-meta font-medium">$</span>
                <input
                  type="number"
                  placeholder="Mín"
                  value={minPriceStr}
                  onChange={(e) => setMinPriceStr(e.target.value)}
                  className="w-full pl-5 pr-2 py-2 text-[13px] rounded-lg border border-divider focus:border-belia-coral focus:ring-1 focus:ring-belia-coral/30 bg-surface-container-low outline-none transition-colors"
                />
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-text-meta font-medium">$</span>
                <input
                  type="number"
                  placeholder="Máx"
                  value={maxPriceStr}
                  onChange={(e) => setMaxPriceStr(e.target.value)}
                  className="w-full pl-5 pr-2 py-2 text-[13px] rounded-lg border border-divider focus:border-belia-coral focus:ring-1 focus:ring-belia-coral/30 bg-surface-container-low outline-none transition-colors"
                />
              </div>
            </div>
            <button
              onClick={handlePriceApply}
              className="w-full py-2 rounded-lg bg-belia-blush text-belia-red text-[13px] font-semibold hover:bg-belia-red hover:text-white transition-all duration-250 ease-spring"
            >
              Aplicar
            </button>
          </div>
        </FilterSection>
      </div>
    </div>
  );
}
