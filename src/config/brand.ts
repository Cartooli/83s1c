// 83s1c fork-owned: single source of truth for product identity (SPEC §3).
export const BRAND = {
  name: '83s1c',
  tagline: 'Markets and world events, sourced',
  origin: 'https://83s1c.online',
  // AGPL §13 source offer. The repo becomes public at M5; until then the site is behind
  // Vercel Authentication, so there are no outside users to offer it to.
  sourceUrl: 'https://github.com/Cartooli/83s1c',
  licenseUrl: 'https://github.com/Cartooli/83s1c/blob/main/LICENSE',
  upstreamName: 'World Monitor',
  upstreamUrl: 'https://github.com/koala73/worldmonitor',
} as const;

/** Source link pinned to the deployed commit; falls back to the default branch locally. */
export function sourceUrlForBuild(sha: string): string {
  return /^[0-9a-f]{7,40}$/.test(sha) ? `${BRAND.sourceUrl}/tree/${sha}` : BRAND.sourceUrl;
}
