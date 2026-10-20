// 83s1c fork-owned: Daily Brief layout model. Pure, so it runs under node --test.
// Inputs are the existing news digest buckets (finance + full variants, no new feeds).

export interface BriefItem {
  title: string;
  source: string;
  link: string;
  publishedAt: number;
  importanceScore?: number;
}

export type DigestBuckets = Record<string, { items: BriefItem[] }>;

/** Digest categories (variant:category) per Brief section. */
export const BRIEF_SECTIONS = [
  { title: 'Markets & Macro', keys: ['finance:markets', 'finance:economic', 'finance:bonds', 'finance:forex'] },
  { title: 'World', keys: ['full:europe', 'full:middleeast', 'full:us'] },
  { title: 'Policy', keys: ['full:politics', 'finance:centralbanks'] },
  { title: 'Tech', keys: ['full:tech', 'full:ai'] },
] as const;

export const BRIEF_VARIANTS = ['finance', 'full'] as const;
const PER_SECTION = 5;
const SECONDARY = 3;

export interface BriefLayout {
  lead: BriefItem | null;
  secondary: BriefItem[];
  sections: { title: string; items: BriefItem[] }[];
}

function safeLink(link: string): boolean {
  return /^https?:\/\//i.test(link);
}

/** Merge per-variant buckets under `variant:category` keys. */
export function mergeDigests(byVariant: Partial<Record<string, DigestBuckets>>): DigestBuckets {
  const out: DigestBuckets = {};
  for (const [variant, buckets] of Object.entries(byVariant)) {
    for (const [cat, bucket] of Object.entries(buckets ?? {})) out[`${variant}:${cat}`] = bucket;
  }
  return out;
}

export function buildBrief(buckets: DigestBuckets): BriefLayout {
  const seen = new Set<string>();
  const sectionPools = BRIEF_SECTIONS.map((s) => {
    const items = s.keys.flatMap((k) => buckets[k]?.items ?? []).filter((i) => i.title && safeLink(i.link));
    return { title: s.title, items: items.sort((a, b) => b.publishedAt - a.publishedAt) };
  });
  const ranked = sectionPools
    .flatMap((s) => s.items)
    .sort((a, b) => (b.importanceScore ?? 0) - (a.importanceScore ?? 0) || b.publishedAt - a.publishedAt);
  const top: BriefItem[] = [];
  for (const item of ranked) {
    if (top.length > SECONDARY) break;
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    top.push(item);
  }
  const sections = sectionPools.map((s) => {
    const items: BriefItem[] = [];
    for (const item of s.items) {
      if (items.length >= PER_SECTION) break;
      if (seen.has(item.link)) continue;
      seen.add(item.link);
      items.push(item);
    }
    return { title: s.title, items };
  });
  return { lead: top[0] ?? null, secondary: top.slice(1), sections };
}
