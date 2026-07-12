import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCategories } from '../../hooks/useCategories';
import { useCartStore } from '../../store/cartStore';
import { MobileMenu } from './MobileMenu';

/**
 * Header — Dynamic header with Belia mega-menu (Desktop) and hamburger (Mobile).
 * Navigation data is fetched from Supabase via useCategories() — never hardcoded.
 * Validates 3-click rule: home → category → product is 2 clicks from this header.
 */
export function Header() {
  const { categoryTree, loading } = useCategories();
  const { items, setIsCartOpen } = useCartStore();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const navigate = useNavigate();

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      void navigate(`/categoria/todos?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-white sticky top-0 z-50 border-b border-divider"
      >
        <div className="flex justify-between items-center w-full px-margin py-4 max-w-7xl mx-auto">
          {/* ─ Search ─────────────────────── */}
          <div className="flex items-center gap-gutter flex-1">
            <form onSubmit={handleSearch} className="hidden md:flex items-center bg-gray-50 border border-divider rounded-full px-4 py-2 w-64 focus-within:border-belia-red focus-within:ring-1 focus-within:ring-belia-red transition-colors">
              <span className="material-symbols-outlined text-text-secondary mr-2 text-base">search</span>
              <input
                className="bg-transparent border-none focus:ring-0 p-0 w-full text-sm placeholder-text-meta outline-none"
                placeholder="Buscar productos o marcas..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-text-primary"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>

          {/* ─ Logo ─────────────────────────── */}
          <div className="flex-shrink-0 flex justify-center flex-1">
            <Link to="/" className="font-headline-md text-3xl font-bold text-belia-red tracking-tight">
              Belia
            </Link>
          </div>

          {/* ─ Nav links + Cart ─────────────── */}
          <div className="flex items-center justify-end gap-element-gap flex-1">
            <Link
              to="/proveedores"
              className="hidden md:inline-flex text-sm text-text-secondary hover:text-belia-red transition-colors"
            >
              Acceso Estilistas
            </Link>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCartOpen(true)}
              className="p-2 text-text-primary hover:text-belia-red transition-colors relative"
              aria-label={`Carrito: ${cartItemCount} productos`}
            >
              <span className="material-symbols-outlined">shopping_cart</span>
              {cartItemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={cartItemCount}
                  transition={{ type: 'spring', stiffness: 300, damping: 10 }}
                  className="absolute top-0 right-0 bg-belia-red text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center"
                >
                  {cartItemCount}
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>

        {/* ─ Mega-menu nav bar ─────────────── */}
        {!loading && categoryTree.length > 0 && (
          <nav
            className="hidden md:flex border-t border-divider"
            onMouseLeave={() => setActiveCategory(null)}
          >
            <div className="flex items-center gap-6 px-margin max-w-7xl mx-auto w-full">
              {categoryTree.map((cat) => (
                <div
                  key={cat.id}
                  className="relative"
                  onMouseEnter={() => setActiveCategory(cat.id)}
                >
                  <Link
                    to={`/categoria/${cat.slug}`}
                    className="inline-block py-3 text-sm font-medium text-text-secondary hover:text-belia-red transition-colors"
                  >
                    {cat.name}
                  </Link>

                  {/* Mega-menu dropdown */}
                  <AnimatePresence>
                    {activeCategory === cat.id && cat.children.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.18 }}
                        className="absolute left-0 top-full bg-white border border-divider rounded-lg shadow-lg p-4 min-w-[200px] z-50"
                      >
                        {cat.children.map((sub) => (
                          <Link
                            key={sub.id}
                            to={`/categoria/${sub.slug}`}
                            className="block py-2 px-3 text-sm text-text-secondary hover:text-belia-red hover:bg-surface-container rounded transition-colors"
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </nav>
        )}
      </motion.header>

      {/* ─ Mobile Menu ──────────────────────── */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        categoryTree={categoryTree}
      />
    </>
  );
}
