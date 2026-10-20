// 83s1c fork-owned: Terminal tile set and pure helpers. Runs under node --test.

export type TileId = 'rates' | 'curve' | 'fx' | 'crypto' | 'calendar' | 'hotspots' | 'quotes';

export interface TileDef {
  id: TileId;
  title: string;
  source: string;
  /** Quote-fed (Finnhub / Alpha Vantage / Yahoo): desk only. */
  quote?: true;
}

const OPEN_TILES: TileDef[] = [
  { id: 'rates', title: 'US Treasury rates', source: 'FRED' },
  { id: 'curve', title: 'Yield curve', source: 'FRED · ECB' },
  { id: 'fx', title: 'FX (EUR base)', source: 'ECB' },
  { id: 'crypto', title: 'Crypto', source: 'CoinGecko' },
  { id: 'calendar', title: 'Economic calendar', source: 'FRED · Fed · ECB · EC' },
  { id: 'hotspots', title: 'Active hotspots', source: 'Headline mentions' },
];

const QUOTE_TILES: TileDef[] = [{ id: 'quotes', title: 'Market quotes', source: 'Desk feed', quote: true }];

/** Quote tiles are absent (not empty) unless MARKET_QUOTES_ENABLED. */
export function terminalTiles(quotesEnabled: boolean): TileDef[] {
  return quotesEnabled ? [...OPEN_TILES, ...QUOTE_TILES] : OPEN_TILES;
}

export interface HotspotLike {
  id: string;
  name: string;
  lat: number;
  lon: number;
  keywords: string[];
  level?: 'low' | 'elevated' | 'high';
}

/** Hotspots whose keywords appear in current headlines, most-mentioned first. */
export function activeHotspots<H extends HotspotLike>(hotspots: H[], headlines: string[], max = 12): (H & { mentions: number })[] {
  const lower = headlines.map((h) => h.toLowerCase());
  return hotspots
    .map((h) => {
      const kws = h.keywords.map((k) => k.toLowerCase()).filter((k) => k.length > 2);
      return { ...h, mentions: lower.filter((t) => kws.some((k) => t.includes(k))).length };
    })
    .filter((h) => h.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, max);
}

/** Equirectangular projection into a w×h box. */
export function project(lat: number, lon: number, w: number, h: number): [number, number] {
  return [((lon + 180) / 360) * w, ((90 - lat) / 180) * h];
}

/** Polyline points for a series in a w×h box; nulls are skipped. Pass min/max to share an axis. */
export function linePoints(values: (number | null)[], w: number, h: number, min?: number, max?: number): string {
  const nums = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (nums.length < 2) return '';
  const lo = min ?? Math.min(...nums);
  const span = (max ?? Math.max(...nums)) - lo || 1;
  const step = w / Math.max(values.length - 1, 1);
  return values
    .map((v, i) => (v === null || !Number.isFinite(v) ? null : `${(i * step).toFixed(1)},${(h - ((v - lo) / span) * h).toFixed(1)}`))
    .filter(Boolean)
    .join(' ');
}
