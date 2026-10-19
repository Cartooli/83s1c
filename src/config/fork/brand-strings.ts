// 83s1c fork-owned: rebrand upstream product-name mentions in every locale at lookup time,
// so the ~30 upstream locale files stay untouched for merges. Attribution text lives
// outside i18n (footer, /source) and is not affected.
import { BRAND } from '@/config/brand';

export function rebrand(value: string): string {
  return value
    .replace(/WORLD MONITOR/g, BRAND.name.toUpperCase())
    .replace(/World ?Monitor/g, BRAND.name);
}

export const brandPostProcessor = {
  type: 'postProcessor' as const,
  name: 'fork-brand',
  process: (value: string): string => rebrand(value),
};
