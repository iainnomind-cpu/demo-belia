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
