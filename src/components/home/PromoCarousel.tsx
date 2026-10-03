import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CarouselSlide } from '../../hooks/useSiteContent';
import { SmartLink } from './SmartLink';

const AUTOPLAY_MS = 6000;

/**
 * PromoCarousel — Promotional slides edited in /admin/content (home_carousel).
 * Renders nothing when there are no slides with an image.
 */
export function PromoCarousel({ slides }: { slides: CarouselSlide[] }) {
  const valid = slides.filter((s) => s.image_url);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (valid.length < 2 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % valid.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [valid.length, paused]);

  if (valid.length === 0) return null;

  const current = valid[Math.min(index, valid.length - 1)];
  const go = (delta: number) => setIndex((i) => (i + delta + valid.length) % valid.length);
  const hasText = !!(current.title || current.subtitle || current.cta_text);

  return (
    <section className="py-10 md:py-12 bg-white" aria-roledescription="carrusel" aria-label="Promociones">
      <div className="container-belia">
        <div
          className="relative overflow-hidden rounded-3xl border border-divider bg-belia-cream shadow-belia-md aspect-[4/3] sm:aspect-[21/9] lg:aspect-[3/1]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
              className="absolute inset-0"
            >
              <img
                src={current.image_url}
                alt={current.title || 'Promoción Belia'}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {hasText && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
                  <div className="absolute inset-0 flex items-end sm:items-center">
                    <div className="p-6 pb-12 sm:py-10 sm:pl-20 sm:pr-10 lg:pl-24 max-w-2xl text-white">
                      {current.title && (
                        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05] mb-3">
                          {current.title}
                        </h2>
                      )}
                      {current.subtitle && (
                        <p className="text-sm sm:text-lg text-white/85 leading-relaxed mb-5 line-clamp-3">
                          {current.subtitle}
                        </p>
                      )}
                      {current.cta_text && (
                        <SmartLink
                          to={current.cta_url || '/categoria/todos'}
                          className="inline-flex items-center gap-2 bg-white text-belia-charcoal px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-belia-red hover:text-white transition-colors shadow-belia-sm"
                        >
                          {current.cta_text}
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </SmartLink>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Image-only slide: the whole banner is the link */}
              {!hasText && current.cta_url && (
                <SmartLink to={current.cta_url} className="absolute inset-0" >
                  <span className="sr-only">Ver promoción</span>
                </SmartLink>
              )}
            </motion.div>
          </AnimatePresence>

          {valid.length > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                aria-label="Anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/85 backdrop-blur text-belia-charcoal hidden sm:flex items-center justify-center hover:bg-white shadow-belia-sm"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button
                onClick={() => go(1)}
                aria-label="Siguiente"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/85 backdrop-blur text-belia-charcoal hidden sm:flex items-center justify-center hover:bg-white shadow-belia-sm"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
              <div className="absolute bottom-4 right-5 z-10 flex gap-2">
                {valid.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    aria-label={`Ir a la promoción ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/55 hover:bg-white/80'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
