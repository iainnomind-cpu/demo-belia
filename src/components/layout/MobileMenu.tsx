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
 * Renders the same categories as the desktop mega-menu — no separate config.
 * Per Belia Constitution: Mobile validated at ≤ 375px before marked done.
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
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Slide-in panel */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-[280px] max-w-[85vw] bg-white z-50 flex flex-col shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-divider">
              <Link
                to="/"
                onClick={onClose}
                className="font-headline-md text-2xl font-bold text-belia-red"
              >
                Belia
              </Link>
              <button
                onClick={onClose}
                className="p-2 text-text-secondary hover:text-belia-red transition-colors"
                aria-label="Cerrar menú"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
              {categoryTree.map((cat) => (
                <div key={cat.id}>
                  <Link
                    to={`/categoria/${cat.slug}`}
                    onClick={onClose}
                    className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-text-primary hover:text-belia-red hover:bg-surface-container transition-colors"
                  >
                    {cat.name}
                  </Link>
                  {cat.children.map((sub) => (
                    <Link
                      key={sub.id}
                      to={`/categoria/${sub.slug}`}
                      onClick={onClose}
                      className="block px-8 py-2 text-sm text-text-secondary hover:text-belia-red hover:bg-surface-container transition-colors"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              ))}

              <div className="border-t border-divider mt-4 pt-4 px-4">
                <Link
                  to="/proveedores"
                  onClick={onClose}
                  className="flex items-center gap-2 py-2 text-sm text-text-secondary hover:text-belia-red transition-colors"
                >
                  <span className="material-symbols-outlined text-base">business</span>
                  Acceso Estilistas
                </Link>
              </div>
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
