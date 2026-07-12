import { useState } from 'react';

interface FiltersSidebarProps {
  brands: string[];
  currentFilters: {
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
  };
  onFilterChange: (filters: { brand?: string; minPrice?: number; maxPrice?: number }) => void;
}

export function FiltersSidebar({ brands, currentFilters, onFilterChange }: FiltersSidebarProps) {
  const [minPriceStr, setMinPriceStr] = useState(currentFilters.minPrice?.toString() || '');
  const [maxPriceStr, setMaxPriceStr] = useState(currentFilters.maxPrice?.toString() || '');

  const handleBrandChange = (brand: string) => {
    onFilterChange({
      ...currentFilters,
      brand: currentFilters.brand === brand ? undefined : brand
    });
  };

  const handlePriceApply = () => {
    onFilterChange({
      ...currentFilters,
      minPrice: minPriceStr ? parseFloat(minPriceStr) : undefined,
      maxPrice: maxPriceStr ? parseFloat(maxPriceStr) : undefined
    });
  };

  return (
    <div className="w-full lg:w-64 flex-shrink-0">
      <div className="bg-white rounded-xl border border-divider p-6 sticky top-24">
        <h2 className="font-headline-sm font-bold text-lg text-text-primary mb-6">Filtros</h2>
        
        {/* Brand Filter */}
        <div className="mb-8">
          <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wider mb-3">Marcas</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {brands.map(brand => (
              <label key={brand} className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={currentFilters.brand === brand}
                  onChange={() => handleBrandChange(brand)}
                  className="rounded border-gray-300 text-belia-red focus:ring-belia-red"
                />
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                  {brand}
                </span>
              </label>
            ))}
            {brands.length === 0 && (
              <p className="text-sm text-text-meta">No hay marcas disponibles.</p>
            )}
          </div>
        </div>

        {/* Price Filter */}
        <div>
          <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wider mb-3">Precio (MXN)</h3>
          <div className="flex items-center gap-2 mb-3">
            <input 
              type="number" 
              placeholder="Min" 
              value={minPriceStr}
              onChange={(e) => setMinPriceStr(e.target.value)}
              className="w-full text-sm rounded-md border-gray-300 focus:border-belia-red focus:ring-belia-red p-2"
            />
            <span className="text-text-meta">-</span>
            <input 
              type="number" 
              placeholder="Max" 
              value={maxPriceStr}
              onChange={(e) => setMaxPriceStr(e.target.value)}
              className="w-full text-sm rounded-md border-gray-300 focus:border-belia-red focus:ring-belia-red p-2"
            />
          </div>
          <button 
            onClick={handlePriceApply}
            className="w-full bg-surface-container text-belia-red hover:bg-belia-red hover:text-white text-sm font-semibold py-2 rounded-md transition-colors"
          >
            Aplicar Precio
          </button>
        </div>
      </div>
    </div>
  );
}
