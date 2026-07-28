import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCategories } from '../../hooks/useCategories';
import { useCartStore } from '../../store/cartStore';
import { MobileMenu } from './MobileMenu';

/**
 * Header — Belia premium header con mega-menú tipo Sephora.
 * - Desktop: barra de navegación con mega-menú desplegable al hover (sin click)
 * - Mobile: hamburguesa con panel overlay glassmorphism
 * - Logo: imagen real /logo.jpeg centrada
 * - Buscador: siempre visible en desktop
 * - Regla: máximo 3 clics hasta producto (home → cat → producto = 2 desde aquí)
 */
export function Header() {
  const { categoryTree, loading } = useCategories();
  const { items, setIsCartOpen } = useCartStore();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Detectar scroll para efecto de sombra en header
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      void navigate(`/categoria/todos?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Mostrar mega-menú con pequeño delay para evitar destellos accidentales
  const handleMouseEnter = (catId: string) => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setActiveCategory(catId);
  };

  const handleMouseLeave = () => {
    hideTimeout.current = setTimeout(() => setActiveCategory(null), 120);
  };

  const handleMegaMenuEnter = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
  };

  const activecat = categoryTree.find((c) => c.id === activeCategory);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 backdrop-blur-xl bg-white/85 ${
          isScrolled ? 'shadow-[0_4px_30px_rgba(0,0,0,0.08)] border-b border-white/20' : 'border-b border-divider'
        }`}
      >
        {/* ─── Top bar: promo / info ─────────────────────────────── */}
        <div className="bg-belia-red text-white text-center py-2 px-4 text-[11px] font-medium tracking-wide hidden md:block">
          🌸 Envío gratis en compras mayores a $499 · Productos de belleza profesional
        </div>

        {/* ─── Main header row ────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 md:px-8 py-3 max-w-7xl mx-auto gap-4">

          {/* Search — left (desktop) / hamburger (mobile) */}
          <div className="flex items-center gap-3 flex-1">
            {/* Mobile hamburger */}
            <button
              className="md:hidden flex flex-col gap-[5px] p-2 text-belia-charcoal"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <span className="block w-5 h-[1.5px] bg-current rounded-full" />
              <span className="block w-5 h-[1.5px] bg-current rounded-full" />
              <span className="block w-3.5 h-[1.5px] bg-current rounded-full" />
            </button>

            {/* Buscador desktop */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex search-input w-72 xl:w-80"
            >
              <span className="material-symbols-outlined text-belia-gray text-[18px]">search</span>
              <input
                className="bg-transparent border-none focus:ring-0 p-0 w-full text-sm placeholder-text-meta outline-none font-body-md"
                placeholder="Buscar productos, marcas o tonos..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>

          {/* ─── Logo centrado ─────────────────────────────────────── */}
          <div className="flex-shrink-0 flex justify-center">
            <Link to="/" aria-label="Belia — Inicio">
              <img
                src="/logo.png"
                alt="Belia"
                className="h-12 md:h-14 w-auto object-contain"
                style={{ filter: 'drop-shadow(0 1px 4px rgba(246,66,60,0.15))' }}
              />
            </Link>
          </div>

          {/* ─── Acciones derecha ──────────────────────────────────── */}
          <div className="flex items-center justify-end gap-1 md:gap-3 flex-1">
            {/* Buscador mobile (ícono) */}
            <button
              className="md:hidden p-2 text-text-secondary hover:text-belia-red transition-colors"
              aria-label="Buscar"
            >
              <span className="material-symbols-outlined text-[22px]">search</span>
            </button>

            {/* Acceso estilistas */}
            <Link
              to="/proveedores"
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-belia-red transition-colors px-3 py-2 rounded-full hover:bg-belia-blush"
            >
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              Estilistas
            </Link>

            {/* Mi cuenta */}
            <Link
              to="/cuenta"
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-belia-red transition-colors px-3 py-2 rounded-full hover:bg-belia-blush"
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
              <span className="hidden lg:inline">Mi cuenta</span>
            </Link>

            {/* Carrito */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center justify-center p-2 text-text-secondary hover:text-belia-red transition-colors rounded-full hover:bg-belia-blush"
              aria-label={`Carrito: ${cartItemCount} productos`}
            >
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
              <AnimatePresence>
                {cartItemCount > 0 && (
                  <motion.span
                    key={cartItemCount}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="absolute -top-0.5 -right-0.5 bg-belia-red text-white text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center"
                  >
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* ─── Mega-menú nav bar ─────────────────────────────────────── */}
        {!loading && categoryTree.length > 0 && (
          <nav
            className="hidden md:block border-t border-divider bg-white"
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex items-center px-4 md:px-8 max-w-7xl mx-auto w-full gap-1">
              {/* Link "Todos" */}
              <Link
                to="/categoria/todos"
                className="py-3 px-3 text-[13px] font-semibold text-text-secondary hover:text-belia-red transition-colors whitespace-nowrap relative group"
              >
                Ver todo
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-belia-red scale-x-0 group-hover:scale-x-100 transition-transform duration-250 ease-spring origin-left rounded-full" />
              </Link>

              {categoryTree.map((cat) => (
                <div
                  key={cat.id}
                  className="relative"
                  onMouseEnter={() => handleMouseEnter(cat.id)}
                >
                  <Link
                    to={`/categoria/${cat.slug}`}
                    className={`py-3 px-3 text-[13px] font-semibold transition-colors whitespace-nowrap relative group inline-block ${
                      activeCategory === cat.id
                        ? 'text-belia-red'
                        : 'text-text-secondary hover:text-belia-red'
                    }`}
                  >
                    {cat.name}
                    <span className={`absolute bottom-0 left-3 right-3 h-[2px] bg-belia-red transition-transform duration-250 ease-spring origin-left rounded-full ${
                      activeCategory === cat.id ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`} />
                  </Link>
                </div>
              ))}

              {/* Divisor + Ofertas */}
              <div className="ml-auto">
                <Link
                  to="/categoria/todos?promo=true"
                  className="py-3 px-3 text-[13px] font-bold text-belia-red hover:text-belia-coral transition-colors whitespace-nowrap"
                >
                  🔥 Ofertas
                </Link>
              </div>
            </div>
          </nav>
        )}

        {/* ─── Mega-menú panel completo (tipo Sephora) ──────────────── */}
        <AnimatePresence>
          {activeCategory && activecat && activecat.children.length > 0 && (
            <motion.div
              ref={megaMenuRef}
              key={activeCategory}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
              className="absolute left-0 right-0 top-full bg-white shadow-mega-menu border-t border-divider z-40"
              onMouseEnter={handleMegaMenuEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="max-w-7xl mx-auto px-8 py-8 flex gap-12">
                {/* Columna de subcategorías */}
                <div className="flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-belia-gray mb-4">
                    {activecat.name}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-1">
                    {activecat.children.map((sub, i) => (
                      <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                      >
                        <Link
                          to={`/categoria/${sub.slug}`}
                          onClick={() => setActiveCategory(null)}
                          className="flex items-center gap-2 py-2 px-3 rounded-lg text-sm text-text-secondary hover:text-belia-red hover:bg-belia-blush transition-colors group"
                        >
                          <span className="w-1 h-1 rounded-full bg-belia-coral opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          {sub.name}
                        </Link>
                      </motion.div>
                    ))}
                  </div>

                  {/* Ver todo la categoría */}
                  <Link
                    to={`/categoria/${activecat.slug}`}
                    onClick={() => setActiveCategory(null)}
                    className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-belia-red hover:text-belia-coral transition-colors"
                  >
                    Ver todo en {activecat.name}
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>

                {/* Panel editorial derecho */}
                <div className="hidden lg:flex flex-col justify-between w-56 xl:w-64 flex-shrink-0">
                  <div className="rounded-2xl bg-belia-gradient-soft border border-belia-pink/20 p-5 h-full flex flex-col justify-between">
                    <div>
                      <span className="belia-eyebrow text-[9px] mb-2 inline-flex">Destacado</span>
                      <p className="text-sm font-bold text-belia-charcoal leading-tight mt-2">
                        Descubre lo mejor de {activecat.name}
                      </p>
                      <p className="text-xs text-text-secondary mt-1.5">
                        Productos seleccionados por nuestros expertos
                      </p>
                    </div>
                    <Link
                      to={`/categoria/${activecat.slug}`}
                      onClick={() => setActiveCategory(null)}
                      className="mt-4 btn-primary text-xs py-2 px-4 self-start"
                    >
                      Explorar
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─── Mobile Menu ─────────────────────────────────────────────── */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        categoryTree={categoryTree}
      />
    </>
  );
}
