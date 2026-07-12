import { useState, useEffect } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { ProductCard } from '../../components/catalog/ProductCard';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { SupplierProduct } from '../../types/database';
import { Link } from 'react-router-dom';

export function HomePage() {
  const { user } = useAuth();
  const { products, loading } = useProducts();
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [loadingSupplier, setLoadingSupplier] = useState(false);

  // If user is a supplier, we fetch using the RPC to get price_proveedor
  useEffect(() => {
    if (user?.role === 'proveedor' || user?.role === 'admin') {
      const fetchSupplierPrices = async () => {
        setLoadingSupplier(true);
        const { data } = await supabase.rpc('get_supplier_products');
        if (data) setSupplierProducts(data);
        setLoadingSupplier(false);
      };
      void fetchSupplierPrices();
    }
  }, [user]);

  // Merge public products with supplier prices if applicable
  const displayProducts = products.map(p => {
    const sp = supplierProducts.find(s => s.id === p.id);
    return { ...p, supplierPrice: sp?.price_proveedor };
  });

  const featured = displayProducts.filter(p => p.featured_label);
  const newArrivals = displayProducts.slice(0, 8); // Just take the first 8 for demo

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-surface-container relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-margin py-section-desktop flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 z-10">
            <h1 className="font-hero-display text-5xl md:text-6xl font-bold text-text-primary leading-tight mb-6">
              Equipamiento Profesional <br/><span className="text-belia-red">para Salones</span>
            </h1>
            <p className="text-lg text-text-secondary mb-8 max-w-lg">
              Descubre nuestro catálogo exclusivo para profesionales de la belleza con las mejores marcas del mercado.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/categoria/todos" className="bg-belia-red text-white px-8 py-3 rounded-full font-bold hover:bg-belia-red-deep transition-colors shadow-md">
                Ver Catálogo
              </Link>
              {!user && (
                <Link to="/proveedores" className="bg-white text-text-primary border border-divider px-8 py-3 rounded-full font-bold hover:border-belia-red hover:text-belia-red transition-colors">
                  Acceso Estilistas
                </Link>
              )}
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="aspect-square bg-surface-dim rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] opacity-50"></div>
            <img 
              src="https://images.unsplash.com/photo-1522337660859-02fbefca4702?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
              alt="Salon Equipment" 
              className="relative z-10 rounded-2xl shadow-2xl object-cover h-[500px] w-full"
            />
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="py-section-desktop bg-white">
        <div className="max-w-7xl mx-auto px-margin">
          <div className="text-center mb-12">
            <h2 className="font-headline-lg text-3xl font-bold text-text-primary mb-4">Destacados</h2>
            <div className="h-1 w-24 bg-belia-red mx-auto rounded-full"></div>
          </div>
          
          {loading || loadingSupplier ? (
            <div className="flex justify-center"><div className="animate-spin h-8 w-8 border-t-2 border-belia-red rounded-full"></div></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter">
              {featured.length > 0 ? featured.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  supplierPrice={product.supplierPrice} 
                />
              )) : (
                <p className="col-span-full text-center text-text-meta">No hay productos destacados por el momento.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Novedades */}
      <section className="py-section-desktop bg-surface-bright">
        <div className="max-w-7xl mx-auto px-margin">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="font-headline-lg text-3xl font-bold text-text-primary mb-2">Nuevos Ingresos</h2>
              <p className="text-text-secondary">Lo último en tecnología y mobiliario</p>
            </div>
            <Link to="/categoria/todos" className="text-belia-red font-bold hover:underline hidden md:block">
              Ver todo &rarr;
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter">
            {!loading && newArrivals.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                supplierPrice={product.supplierPrice} 
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
