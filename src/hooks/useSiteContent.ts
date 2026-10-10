import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/** home_banner_main — every field is optional; the storefront falls back to its default copy */
export interface HeroContent {
  badge?: string;
  title?: string;
  subtitle?: string;
  cta_text?: string;
  cta_url?: string;
  image_url?: string;
}

export interface CarouselSlide {
  image_url: string;
  title?: string;
  subtitle?: string;
  cta_text?: string;
  cta_url?: string;
}

/** home_carousel */
export interface CarouselContent {
  slides?: CarouselSlide[];
}

/** business_info — contact and legal data used by the footer, legal pages, WhatsApp buttons and emails */
export interface BusinessInfo {
  nombre_comercial?: string;
  razon_social?: string;
  rfc?: string;
  domicilio?: string;
  email?: string;
  telefono?: string;
  whatsapp?: string;       // digits with country code, e.g. 523380007919
  horario?: string;
  tiempo_entrega?: string;
  dias_devolucion?: string;
  instagram?: string;
  facebook?: string;
}

export const BUSINESS_DEFAULTS: Required<BusinessInfo> = {
  nombre_comercial: 'Belia',
  razon_social: '',
  rfc: '',
  domicilio: '',
  email: '',
  telefono: '',
  whatsapp: '523380007919',
  horario: 'Lunes a viernes de 9:00 a 18:00 h',
  tiempo_entrega: '3 a 7 días hábiles',
  dias_devolucion: '15',
  instagram: '',
  facebook: '',
};

/** WhatsApp link with an optional pre-filled message */
export const whatsappUrl = (number: string, text?: string) =>
  `https://wa.me/${number.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

type ContentMap = Record<string, unknown>;

// site_content is tiny and rarely changes: load it once per page load and share it
let cache: Promise<ContentMap> | null = null;

function loadContent(): Promise<ContentMap> {
  if (!cache) {
    cache = (async () => {
      const { data, error } = await supabase.from('site_content').select('id, content_data');
      if (error) {
        cache = null; // allow a retry on the next mount
        return {};
      }
      return Object.fromEntries((data ?? []).map((row: { id: string; content_data: unknown }) => [row.id, row.content_data]));
    })();
  }
  return cache;
}

/**
 * useSiteContent — Reads an editable block from site_content (edited in /admin/content).
 * Returns null while loading or if the block does not exist.
 */
export function useSiteContent<T>(id: string): { content: T | null; loading: boolean } {
  const [content, setContent] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void loadContent().then((map) => {
      if (!active) return;
      setContent((map[id] as T | undefined) ?? null);
      setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  return { content, loading };
}

/** Business data with defaults for empty fields */
export function useBusinessInfo(): Required<BusinessInfo> {
  const { content } = useSiteContent<BusinessInfo>('business_info');
  const merged = { ...BUSINESS_DEFAULTS };
  for (const key of Object.keys(merged) as (keyof BusinessInfo)[]) {
    const value = content?.[key]?.trim();
    if (value) merged[key] = value;
  }
  return merged;
}
