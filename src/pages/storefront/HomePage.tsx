import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, Variants } from 'framer-motion';
import { useProducts } from '../../hooks/useProducts';
import { ProductCard } from '../../components/catalog/ProductCard';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { SupplierProduct } from '../../types/database';

/* ─── Animation variants ──────────────────────────────────────── */
const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const itemVariants: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

/* ─── Professional SVG category icons ─────────────────────────── */
const CatIcons = {
  capilar: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
      <path d="M20 6C20 6 14 10 14 18C14 22 16 25 20 27C24 25 26 22 26 18C26 10 20 6 20 6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M16 17C16 17 18 15 20 16C22 17 22 20 20 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M20 27V34" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M17 31H23" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  facial: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
      <circle cx="20" cy="19" r="10" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M16 17C16 17 16 15 18 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M24 17C24 17 24 15 22 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16.5 22C16.5 22 17.5 24 20 24C22.5 24 23.5 22 23.5 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 13C10 13 8 10 10 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M30 13C30 13 32 10 30 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M20 9V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  corporal: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
      <path d="M20 7C21.657 7 23 8.343 23 10C23 11.657 21.657 13 20 13C18.343 13 17 11.657 17 10C17 8.343 18.343 7 20 7Z" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M14 16H26L25 24H22L21 33H19L18 24H15L14 16Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M14 18L11 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M26 18L29 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  tintes: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
      <rect x="13" y="10" width="8" height="20" rx="2" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M13 15H21" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="27" cy="26" r="5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M27 22V26L29 28" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 6V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M15 6H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  herramientas: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
      <path d="M12 28L24 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M24 16C24 16 26 12 29 12C29 15 25 17 25 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="9" y="26" width="5" height="5" rx="1" transform="rotate(-45 9 26)" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M28 22L33 27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M22 28L27 33" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M33 27C33 27 34 30 31 31C28 32 27 33 27 33" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  marcas: (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
      <path d="M20 8L22.9 15.3H30.6L24.3 19.9L26.7 27.2L20 22.6L13.3 27.2L15.7 19.9L9.4 15.3H17.1L20 8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  ),
};

type CatKey = keyof typeof CatIcons;

/* ─── Quick category links ─────────────────────────────────────── */
const QUICK_CATS: { label: string; iconKey: CatKey; slug: string }[] = [
  { label: 'Capilar',      iconKey: 'capilar',      slug: 'capilar'      },
  { label: 'Facial',       iconKey: 'facial',       slug: 'skincare-facial'       },
  { label: 'Corporal',     iconKey: 'corporal',     slug: 'skincare-corporal'     },
  { label: 'Tintes',       iconKey: 'tintes',       slug: 'coloracion-tintes'       },
  { label: 'Herramientas', iconKey: 'herramientas', slug: 'herramientas' },
  { label: 'Marcas',       iconKey: 'marcas',       slug: 'todos'        },
];

/* ─── Section Title ────────────────────────────────────────────── */
function SectionTitle({
  eyebrow, title, subtitle, center = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? 'text-center' : ''}>
      {eyebrow && (
        <span className="belia-eyebrow mb-3 inline-flex">{eyebrow}</span>
      )}
      <h2 className="section-title">{title}</h2>
      {subtitle && (
        <p className="text-text-secondary text-sm mt-2 leading-relaxed">{subtitle}</p>
      )}
      <div className={`section-divider mt-4 ${center ? 'mx-auto' : ''}`} />
    </div>
  );
}

/* ─── Animated section wrapper ─────────────────────────────────── */
function AnimatedSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Product skeleton ─────────────────────────────────────────── */
function ProductSkeleton() {
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

/* ═══════════════════════════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════════════════════════ */
export function HomePage() {
  const { user } = useAuth();
  const { products, loading } = useProducts();
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [loadingSupplier, setLoadingSupplier] = useState(false);

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

  const displayProducts = products.map(p => {
    const sp = supplierProducts.find(s => s.id === p.id);
    return { ...p, supplierPrice: sp?.price_proveedor };
  });

  const featured    = displayProducts.filter(p => p.featured_label).slice(0, 8);
  const newArrivals = displayProducts.slice(0, 8);
  const isLoading   = loading || loadingSupplier;

  return (
    <div className="flex flex-col bg-belia-cream">

      {/* ══════════════════════════════════════════════════════════
          HERO — Antigravity Split Layout (Editorial Professional)
      ══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden min-h-screen flex items-center bg-white">

        {/* ── BACKGROUND SPLIT & ANTIGRAVITY EFFECTS ──────────── */}
        <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[55%] z-0">
          <img
            src="https://images.unsplash.com/photo-1571875257727-256c39da42af?auto=format&fit=crop&w=1600&q=85"
            alt="Productos de belleza profesional"
            className="w-full h-full object-cover scale-[1.02]"
            fetchPriority="high"
          />
          {/* Antigravity mesh gradient blur overlay for depth */}
          <div className="absolute -inset-4 bg-gradient-to-l from-transparent via-white/40 to-white lg:via-transparent lg:to-transparent z-10" />
          <div className="absolute -left-1/4 top-1/4 w-[800px] h-[800px] bg-belia-red/5 rounded-full blur-3xl pointer-events-none z-10" />
        </div>

        <div
          className="absolute left-0 top-0 bottom-0 w-full lg:w-[50%] z-0"
          style={{ background: 'linear-gradient(to right, #FFFFFF 70%, transparent 100%)' }}
        />

        <div className="container-belia w-full relative z-20 pt-4 pb-16 md:pt-8 md:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center" style={{ perspective: 1200 }}>

            {/* ── COPY (Left Side) ──────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, z: -100, rotateX: 10 }}
              animate={{ opacity: 1, z: 0, rotateX: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-start max-w-xl"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Optional: Badge / Announcement */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="inline-flex items-center gap-2 rounded-full bg-belia-blush px-4 py-1.5 text-sm font-bold text-belia-red ring-1 ring-inset ring-belia-red/20 mb-8"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-belia-red animate-pulse"></span>
                Calidad Profesional para Todos
              </motion.div>

              {/* Headline: Value Proposition */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="text-4xl sm:text-5xl lg:text-[4rem] font-extrabold tracking-tight text-belia-charcoal leading-[1.05] mb-6"
                style={{ transform: 'translateZ(20px)' }}
              >
                Tu belleza al máximo{' '}
                <span className="bg-gradient-to-r from-belia-red to-[#FF8FA3] bg-clip-text text-transparent">
                  nivel
                </span>
              </motion.h1>

              {/* Subheadline: Supporting Detail */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="text-lg sm:text-xl text-text-secondary max-w-lg leading-relaxed mb-10"
              >
                Descubre el catálogo definitivo de belleza. Ya seas un apasionado del cuidado personal o un experto en el salón, tenemos las mejores marcas premium para ti.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-12"
              >
                <Link 
                  to="/categoria/todos" 
                  className="w-full sm:w-auto inline-flex items-center justify-center bg-belia-red text-white px-6 py-3 rounded-xl font-bold text-base hover:bg-[#D9302A] shadow-belia-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  Ver todos los productos
                </Link>
                {!user && (
                  <Link 
                    to="/proveedores" 
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-belia-charcoal px-6 py-3 rounded-xl font-bold text-base border border-divider hover:bg-surface-container transition-colors"
                  >
                    ¿Eres profesional?
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                )}
              </motion.div>

              {/* Trust signals */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-text-meta font-semibold"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-belia-red text-[18px]">verified</span>
                  100% Marcas Originales
                </span>
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-belia-red text-[18px]">local_shipping</span>
                  Envío Gratis +$499
                </span>
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-belia-red text-[18px]">group</span>
                  Para todos: hogar y salón
                </span>
              </motion.div>

              {/* Social Proof stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="flex items-center gap-8 pt-8 mt-6 border-t border-divider w-full"
              >
                {[
                  { num: '500+', label: 'Productos' },
                  { num: '50+',  label: 'Marcas'    },
                  { num: '10K+', label: 'Clientes'  },
                ].map(({ num, label }) => (
                  <div key={label} className="flex flex-col">
                    <p
                      className="text-2xl font-extrabold leading-none tracking-tight mb-0.5"
                      style={{
                        background: 'linear-gradient(105deg, #F6423C, #FF8FA3)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {num}
                    </p>
                    <p className="text-[11px] text-text-meta font-bold uppercase tracking-[0.12em]">{label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* ── VISUAL (Right Side - Antigravity Glassmorphism) ──────────────────────────── */}
            <div className="hidden lg:block relative h-[600px] w-full pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
              
              {/* Primary Glass Panel integrated with the Logo */}
              <motion.div
                initial={{ opacity: 0, x: 50, rotateY: -15, rotateX: 10 }}
                animate={{ opacity: 1, x: 0, rotateY: -5, rotateX: 5, y: [-10, 10, -10] }}
                transition={{ 
                  opacity: { duration: 1 },
                  x: { duration: 1, ease: "easeOut" },
                  rotateY: { duration: 1, ease: "easeOut" },
                  rotateX: { duration: 1, ease: "easeOut" },
                  y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }
                }}
                className="absolute top-4 -left-12 bg-white/20 backdrop-blur-xl rounded-3xl p-8 w-80 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border border-white/50 z-20"
              >
                <div className="flex items-center justify-center mb-6" style={{ transform: 'translateZ(30px)' }}>
                  {/* Clean integration of the logo within a glass card */}
                  <img src="/logo.png" alt="Belia" className="w-40 h-auto drop-shadow-xl" />
                </div>
                <div style={{ transform: 'translateZ(20px)' }}>
                  <p className="text-belia-charcoal font-bold text-lg mb-1 leading-tight">La elección de los expertos</p>
                  <p className="text-belia-charcoal/80 text-sm">Todo lo que tu salón necesita en un solo lugar.</p>
                </div>
              </motion.div>

              {/* Secondary Floating Orb */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1, y: [10, -15, 10] }}
                transition={{ 
                  opacity: { delay: 0.6, duration: 0.8 },
                  scale: { delay: 0.6, duration: 0.8, ease: "easeOut" },
                  y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }
                }}
                className="absolute bottom-1/4 right-8 w-32 h-32 rounded-full bg-gradient-to-tr from-belia-red/80 to-[#FF8FA3]/80 backdrop-blur-lg flex items-center justify-center shadow-belia-xl border border-white/30 z-30"
              >
                 <span className="material-symbols-outlined text-white text-[40px]" style={{ transform: 'translateZ(10px)' }}>diamond</span>
              </motion.div>

            </div>
          </div>
        </div>

        {/* Bottom soft fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
      </section>

      {/* ══════════════════════════════════════════════════════════
          QUICK CATEGORIES — íconos SVG lineales premium
      ══════════════════════════════════════════════════════════ */}
      <AnimatedSection className="py-12 bg-white border-b border-divider">
        <div className="container-belia">
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-3 sm:grid-cols-6 gap-3 md:gap-5"
          >
            {QUICK_CATS.map((cat) => (
              <motion.div key={cat.slug} variants={itemVariants}>
                <Link
                  to={`/categoria/${cat.slug}`}
                  className="group flex flex-col items-center gap-3 py-5 px-3 rounded-2xl border border-divider bg-white hover:border-belia-coral hover:bg-belia-blush transition-all duration-250 text-center relative overflow-hidden"
                >
                  {/* Subtle fill on hover */}
                  <span
                    className="absolute inset-0 bg-belia-gradient opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 rounded-2xl"
                    aria-hidden="true"
                  />

                  {/* Icon container */}
                  <span className="relative z-10 w-12 h-12 rounded-xl bg-belia-blush group-hover:bg-white border border-belia-pink/20 flex items-center justify-center text-belia-red transition-all duration-250 group-hover:shadow-belia-sm group-hover:scale-105">
                    {CatIcons[cat.iconKey]}
                  </span>

                  <span className="relative z-10 text-[12px] font-semibold text-text-secondary group-hover:text-belia-red transition-colors leading-tight">
                    {cat.label}
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </AnimatedSection>

      {/* ══════════════════════════════════════════════════════════
          FEATURED / MÁS VENDIDOS — Selección editorial
      ══════════════════════════════════════════════════════════ */}
      <AnimatedSection className="py-section-desktop bg-belia-cream">
        <div className="container-belia">
          <motion.div
            variants={itemVariants}
            className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10"
          >
            <SectionTitle
              eyebrow="Selección Editorial"
              title="Más Vendidos"
              subtitle="Curados por nuestros expertos en belleza"
            />
            <Link to="/categoria/todos" className="btn-ghost text-sm self-start md:self-auto flex-shrink-0">
              Ver todo el catálogo
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : featured.length > 0 ? (
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
            >
              {featured.map((product) => (
                <motion.div key={product.id} variants={itemVariants}>
                  <ProductCard product={product} supplierPrice={product.supplierPrice} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              variants={itemVariants}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-belia-blush border border-belia-pink/30 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-belia-red text-[32px]">star</span>
              </div>
              <p className="text-text-secondary text-sm font-medium">
                Aún no hay destacados configurados.<br />
                Márcalos desde el panel de administración.
              </p>
              <Link to="/categoria/todos" className="btn-primary text-sm mt-6">
                Explorar catálogo
              </Link>
            </motion.div>
          )}
        </div>
      </AnimatedSection>

      {/* ══════════════════════════════════════════════════════════
          BANNER — Estilistas CTA
      ══════════════════════════════════════════════════════════ */}
      {!user && (
        <AnimatedSection className="py-0">
          <div className="container-belia my-8 md:my-12">
            <motion.div
              variants={itemVariants}
              className="relative overflow-hidden rounded-3xl"
              style={{ background: 'linear-gradient(120deg, #232323 0%, #3a1215 100%)' }}
            >
              {/* Gradient accent */}
              <div
                className="absolute inset-0 opacity-30"
                style={{ background: 'linear-gradient(135deg, #F6423C 0%, transparent 60%)' }}
                aria-hidden="true"
              />
              {/* Large faint icon */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none">
                <span className="material-symbols-outlined text-white" style={{ fontSize: '180px' }}>storefront</span>
              </div>

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 p-10 md:p-14">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-block w-5 h-px bg-belia-coral" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-belia-coral">Para Profesionales</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-2">
                    ¿Eres estilista<br className="hidden md:block" /> o dueño de salón?
                  </h2>
                  <p className="text-white/60 text-[14px] max-w-md leading-relaxed">
                    Obtén precios especiales de proveedor, pedidos al mayoreo y atención personalizada para tu negocio.
                  </p>
                </div>
                <Link
                  to="/proveedores"
                  className="flex-shrink-0 inline-flex items-center gap-2 bg-belia-red text-white font-bold text-sm px-8 py-4 rounded-full hover:bg-belia-coral transition-all duration-250 shadow-belia-lg whitespace-nowrap"
                >
                  Solicitar acceso
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      )}

      {/* ══════════════════════════════════════════════════════════
          NUEVOS INGRESOS
      ══════════════════════════════════════════════════════════ */}
      <AnimatedSection className="py-section-desktop bg-white">
        <div className="container-belia">
          <motion.div
            variants={itemVariants}
            className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10"
          >
            <SectionTitle
              eyebrow="Recién llegados"
              title="Nuevos Ingresos"
              subtitle="Los productos más recientes de nuestro catálogo"
            />
            <Link to="/categoria/todos" className="btn-ghost text-sm self-start md:self-auto flex-shrink-0">
              Ver todos
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
            >
              {newArrivals.map((product) => (
                <motion.div key={product.id} variants={itemVariants}>
                  <ProductCard product={product} supplierPrice={product.supplierPrice} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </AnimatedSection>

      {/* ══════════════════════════════════════════════════════════
          TINTE FINDER CTA
      ══════════════════════════════════════════════════════════ */}
      <AnimatedSection className="py-16 bg-belia-cream border-t border-divider">
        <div className="container-belia">
          <motion.div
            variants={itemVariants}
            className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 md:p-12 rounded-3xl bg-belia-blush border border-belia-pink/30"
          >
            <div className="flex items-start gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-white border border-belia-pink/30 flex items-center justify-center flex-shrink-0 shadow-belia-sm">
                {CatIcons.tintes}
              </div>
              <div>
                <h3 className="text-lg font-bold text-belia-charcoal mb-1">¿Buscas un tinte específico?</h3>
                <p className="text-text-secondary text-sm max-w-sm leading-relaxed">
                  Usa nuestro buscador de tonos o habla con un asesor para encontrar el color perfecto.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <Link to="/categoria/tintes" className="btn-primary text-sm px-6">
                <span className="material-symbols-outlined text-[16px]">search</span>
                Buscar tintes
              </Link>
              <a
                href="https://wa.me/521XXXXXXXXXX?text=Hola%2C%20necesito%20asesor%C3%ADa%20para%20elegir%20un%20tinte"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm px-6"
              >
                <span className="material-symbols-outlined text-[16px]">chat</span>
                Asesoría gratis
              </a>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>
    </div>
  );
}
