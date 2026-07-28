import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Category } from '../../types/database';

interface CategoryTree extends Category {
  children: Category[];
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  categoryTree: CategoryTree[];
}

/**
 * MobileMenu — Full-screen slide-in menu for mobile viewports (≤ 375px).
 * Premium glassmorphism overlay, spring physics, and Sephora-like taxonomy.
 */
export function MobileMenu({ isOpen, onClose, categoryTree }: MobileMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Slide-in panel */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed left-0 top-0 h-[100dvh] w-[85vw] max-w-[320px] bg-white z-[70] flex flex-col shadow-mega-menu overflow-hidden"
          >
            {/* ─── Header ────────────────────────────────────── */}
            <div className="flex items-center justify-between p-4 border-b border-divider bg-belia-cream/50">
              <Link
                to="/"
                onClick={onClose}
                className="flex items-center"
              >
                <img
                  src="/logo.jpeg"
                  alt="Belia"
                  className="h-10 w-auto object-contain"
                />
              </Link>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-text-secondary hover:text-belia-red transition-colors bg-white rounded-full shadow-sm border border-divider"
                aria-label="Cerrar menú"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* ─── Navigation ─────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto hide-scrollbar bg-white">
              <nav className="py-2">
                {categoryTree.map((cat, i) => (
                  <motion.div 
                    key={cat.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 + 0.1, duration: 0.3 }}
                    className="border-b border-divider/50 last:border-0"
                  >
                    <Link
                      to={`/categoria/${cat.slug}`}
                      onClick={onClose}
                      className="flex items-center justify-between px-5 py-3.5 text-[15px] font-bold text-belia-charcoal hover:text-belia-red transition-colors bg-white"
                    >
                      {cat.name}
                      <span className="material-symbols-outlined text-text-meta text-[18px]">chevron_right</span>
                    </Link>
                    
                    {cat.children.length > 0 && (
                      <div className="bg-surface-container-low pb-2 pt-1 px-5 grid grid-cols-1 gap-1">
                        {cat.children.map((sub) => (
                          <Link
                            key={sub.id}
                            to={`/categoria/${sub.slug}`}
                            onClick={onClose}
                            className="flex items-center py-2 text-[14px] text-text-secondary hover:text-belia-red transition-colors"
                          >
                            <span className="w-1 h-1 rounded-full bg-belia-pink mr-2" />
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </nav>

              {/* ─── Bottom Actions ────────────────────────────── */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="p-5 mt-4 space-y-3"
              >
                <Link
                  to="/categoria/todos?promo=true"
                  onClick={onClose}
                  className="flex items-center justify-between w-full p-3 rounded-xl bg-belia-gradient-soft border border-belia-pink/30 text-sm font-bold text-belia-red"
                >
                  <span className="flex items-center gap-2">
                    🔥 Ofertas Especiales
                  </span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-divider">
                  <Link
                    to="/cuenta"
                    onClick={onClose}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-divider text-text-secondary hover:border-belia-coral hover:text-belia-red transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">person</span>
                    <span className="text-xs font-semibold">Mi Cuenta</span>
                  </Link>
                  <Link
                    to="/proveedores"
                    onClick={onClose}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-divider text-text-secondary hover:border-belia-coral hover:text-belia-red transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">storefront</span>
                    <span className="text-xs font-semibold">Estilistas</span>
                  </Link>
                </div>
              </motion.div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
