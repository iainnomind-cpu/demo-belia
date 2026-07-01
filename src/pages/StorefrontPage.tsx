import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Navbar } from '../components/Navbar';
import { ProductCard } from '../components/ProductCard';
import { CartSidebar } from '../components/CartSidebar';
import { useProductStore } from '../store/productStore';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 200 } }
};

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

export function StorefrontPage() {
  const products = useProductStore(state => state.products);

  return (
    <>
      <Navbar />
      <CartSidebar />
      <main>
          <section className="bg-gray-50 py-4 border-b border-divider overflow-x-auto hide-scrollbar">
              <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-10px" }} className="max-w-7xl mx-auto px-margin flex items-center space-x-8 min-w-max">
                  <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Compra Directa:</p>
                  {[
                    { icon: "content_cut", label: "Capilar y Tintes" },
                    { icon: "back_hand", label: "Uñas y Manicure" },
                    { icon: "visibility", label: "Pestañas" },
                    { icon: "face", label: "Barbería" },
                    { icon: "spa", label: "Maquillaje y Spa" }
                  ].map((cat, index) => (
                    <motion.a key={index} variants={itemVariants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} href="#" className="flex items-center space-x-2 group">
                        <div className="w-10 h-10 rounded-full bg-white border border-divider flex items-center justify-center group-hover:border-belia-red transition-colors shadow-sm">
                            <span className="material-symbols-outlined text-belia-red text-xl">{cat.icon}</span>
                        </div>
                        <span className="text-xs font-medium text-text-primary group-hover:text-belia-red transition-colors">{cat.label}</span>
                    </motion.a>
                  ))}
              </motion.div>
          </section>

          <section className="relative w-full h-[35vh] min-h-[280px] flex items-center justify-center bg-gray-900 overflow-hidden">
              <motion.div initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 10, ease: "linear" }} className="absolute inset-0 w-full h-full">
                  <img alt="Hero Belia" className="w-full h-full object-cover object-center opacity-60" src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=2000"/>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              </motion.div>
              <div className="relative z-10 w-full px-margin max-w-7xl mx-auto text-center">
                  <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="font-headline-lg text-3xl md:text-5xl text-white mb-3 tracking-tight">
                      Productos Profesionales de Belleza
                  </motion.h1>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.6 }} className="text-sm md:text-base text-gray-200 max-w-xl mx-auto mb-4">
                      Distribuidor oficial de las mejores marcas para estilistas, salones y cuidado personal.
                  </motion.p>
              </div>
          </section>

          <section className="py-12 px-margin max-w-7xl mx-auto bg-white overflow-hidden">
              <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} variants={fadeUpVariants} className="flex justify-between items-end mb-8">
                  <div>
                      <h2 className="font-headline-md text-2xl md:text-3xl text-text-primary flex items-center gap-2">
                          <span className="w-2 h-6 bg-belia-red rounded-full"></span> Los Más Vendidos
                      </h2>
                      <p className="text-sm text-text-secondary mt-1">Añade directo a tu bolsa con un solo clic.</p>
                  </div>
                  <motion.a whileHover={{ x: 5 }} className="text-sm font-semibold text-belia-red flex items-center gap-1 hover:text-belia-red-deep transition-colors" href="#">Ver todo el catálogo →</motion.a>
              </motion.div>

              <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-gutter">
                  {products.map((prod) => (
                    <ProductCard key={prod.id} product={prod} variants={fadeUpVariants} />
                  ))}
              </motion.div>
          </section>

          <section className="border-y border-divider bg-gray-50 overflow-hidden">
              <div className="max-w-7xl mx-auto px-margin py-4">
                  <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center divide-y md:divide-y-0 md:divide-x divide-divider">
                      <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 py-1"><span className="material-symbols-outlined text-belia-red text-xl">local_shipping</span><span className="text-xs font-medium text-text-secondary">Envíos Gratis desde $3,000</span></motion.div>
                      <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 py-1"><span className="material-symbols-outlined text-belia-red text-xl">storefront</span><span className="text-xs font-medium text-text-secondary">Precios de Distribuidor Directos</span></motion.div>
                      <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 py-1"><span className="material-symbols-outlined text-belia-red text-xl">verified</span><span className="text-xs font-medium text-text-secondary">Garantía 100% Profesional</span></motion.div>
                  </motion.div>
              </div>
          </section>

          <section className="py-12 px-margin max-w-7xl mx-auto overflow-hidden">
              <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="font-headline-md text-2xl text-text-primary text-center mb-8">Nuestras Especialidades</motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-[220px]">
                  <motion.a initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.02 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="group relative rounded-xl overflow-hidden md:col-span-8 row-span-2 bg-gray-100 block" href="#">
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10"></div>
                      <img alt="Cuidado Capilar" className="absolute inset-0 w-full h-full object-cover" src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=1200"/>
                      <div className="absolute bottom-0 left-0 p-6 z-20 w-full">
                          <h3 className="text-xl font-bold text-white mb-1">Cuidado Capilar y Tintes</h3>
                          <motion.span whileHover={{ x: 5 }} className="text-xs font-semibold text-white/90 flex items-center gap-1 inline-flex">Explorar Todo →</motion.span>
                      </div>
                  </motion.a>
                  
                  <motion.a initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} whileHover={{ scale: 1.02 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }} className="group relative rounded-xl overflow-hidden md:col-span-4 row-span-1 bg-gray-100 block" href="#">
                      <div className="absolute inset-0 bg-black/20 z-10 group-hover:bg-black/10 transition-colors"></div>
                      <img alt="Uñas" className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAG-F4iaMogCnyEf4eE3HKi4OwnaoUjVF9ASy3Bc81WUqsJnhF8jDaHGW1k0eYsVE8YIA1wHEebAKBj8e5RXqzqGR3ArGPkBPIUsBFjj6iA2DfQo3kQ_cLQWkKlm9WdFtg4zr0wihHa-SDuVjHUEW7ZiKoIvfGf_nN82xtkpLZZbUXpcKmcvWDRRrd45Ycf-xWTO1jDC7rIpxy0Knyifz67pPM94P-GUkRLEYevx6270hIujASgpX65B19OwS9KB5K4NMiMEaBnbQ"/>
                      <div className="absolute bottom-0 left-0 p-4 z-20 w-full"><h3 className="text-lg font-bold text-white">Uñas y Manicure</h3></div>
                  </motion.a>

                  <motion.a initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} whileHover={{ scale: 1.02 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.2 }} className="group relative rounded-xl overflow-hidden md:col-span-4 row-span-1 bg-gray-100 block" href="#">
                      <div className="absolute inset-0 bg-black/20 z-10 group-hover:bg-black/10 transition-colors"></div>
                      <img alt="Pestañas" className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuClBnzzi4OVP7xxUIfd7bWGt2C_dR1gd4Jc0MC_ogYlqYZkx6altBsHGxY1i-8ExXtqUs6FXwVpIykRMkzLWQPj7OAo2zhZhiBOTDmAWFkEZxyHuCGTITJ4kl-8ohXl_84mZL7-Ie2jn9hEpgh5_IHPcENHTXTXERNpJLt2UmeIQ_V1P8Mobcx4_mgeIabygV1TIP6IwaQEdnQFr8aPRGaZ2gD0R7nkkPbeO14K6hlbM1mhuVf98UQBbm2D4Dkjr-UggljyiVFEneE"/>
                      <div className="absolute bottom-0 left-0 p-4 z-20 w-full"><h3 className="text-lg font-bold text-white">Lashistas y Pestañas</h3></div>
                  </motion.a>
              </div>
          </section>

          <section className="pb-12 px-margin max-w-7xl mx-auto overflow-hidden">
              <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }} className="bg-surface-container rounded-2xl p-6 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative">
                  <div className="md:w-1/2 relative z-10">
                      <h2 className="font-headline-md text-2xl md:text-3xl text-text-primary mb-3">¿Eres Estilista o dueño de un Salón?</h2>
                      <p className="text-sm text-text-secondary mb-6">Accede a precios de mayoreo por volumen, promociones de distribuidor y soporte técnico directo para tu negocio de belleza.</p>
                      <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-flex items-center justify-center bg-belia-red text-white text-xs font-bold px-6 py-3.5 rounded-lg hover:bg-belia-red-deep transition-colors shadow-md" href="#">Solicitar Cuenta de Mayoreo</motion.a>
                  </div>
                  <div className="md:w-1/2 w-full grid grid-cols-2 gap-4 relative z-10">
                      <motion.img initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} viewport={{ once: true }} alt="Salon" className="rounded-xl object-cover w-full h-36" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYGJdI7U9Sv1wH66fft02PPSgO0LowtfmO8zyHL6GW6HTW_wsNhda_yNNFClmrmJ5SjtbbmZDKeIKQCd___ovmPxelbEDjriDl01pegG44E3et6NB-pM4zpWJR41zh13u0EGwoLPnkuA9gSt3LOdiP4xJJcr2xjZFGfe5u65pzslHdUNwhcSzavtdiWB8p1DAkZMx8sC6ozvJdkYix2WFfq0tFNsaxs613PV2TswYeFndWBCOgVkcVQLUgb36EmG4B8XUUc0KPcSY"/>
                      <motion.img initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.4 }} viewport={{ once: true }} alt="Tools" className="rounded-xl object-cover w-full h-36 mt-4" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBz0_-ibpPxrInCCFlDNdmZxoYmWKkwPYvqlv14dVsBxY4dcnl6M_jIdIPXFMb5AxkqhnET7XNNkSta3hkz_p1cilP-bEf6zdyeXQKR-e5ycCOnjupopbrA12TvTrOrlB8D516uNq15w_LuOxnd5M2BuuxEKEC7vwz4SwaOdmt0bnRLZHuOgol0me3pSVeCvhcFbaXbcy4G3l1K3dsILi6ZnPUiTjXmzVuYpHcMC3e0Dkwj1QbII9jNnJX1JxScXIfIvY_nCcKjn4"/>
                  </div>
              </motion.div>
          </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 border-t border-divider">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 px-margin py-12 max-w-7xl mx-auto text-sm">
              <div className="flex flex-col gap-3"><span className="text-2xl font-bold text-white">Belia</span><p className="text-xs text-gray-400">© 2026 Belia Professional. Productos de Salón Premium.</p></div>
              <div className="flex flex-col gap-2"><h4 className="text-white font-bold mb-1">Categorías</h4><a className="hover:text-belia-red transition-colors text-xs" href="#">Cuidado Capilar</a><a className="hover:text-belia-red transition-colors text-xs" href="#">Esmaltes y Uñas</a><a className="hover:text-belia-red transition-colors text-xs" href="#">Herramientas Eléctricas</a></div>
              <div className="flex flex-col gap-2"><h4 className="text-white font-bold mb-1">Soporte</h4><a className="hover:text-belia-red transition-colors text-xs" href="#">Envíos y Entregas</a><a className="hover:text-belia-red transition-colors text-xs" href="#">Contacto</a></div>
          </div>
      </footer>
    </>
  );
}
