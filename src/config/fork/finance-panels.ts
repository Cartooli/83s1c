// 83s1c fork-owned: the finance panel set and map layers (SPEC §5, 00-RUN Decisions §2).
// Panels fed by Finnhub, Alpha Vantage or Yahoo (fully or partly) show only on the
// authentication-gated desk deployment, where VITE_MARKET_QUOTES=1. Provider mapping:
// docs/fork/DATA-LICENSES.md.
import type { MapLayers, PanelConfig } from '@/types';

/** Open-data panels, shown on the public site, in display order. */
export const PUBLIC_PANEL_IDS = [
  'map',
  'live-news', // official live-video embeds
  'economic', // FRED, BIS, BLS
  'macro-tiles', // FRED, Eurostat
  'yield-curve', // FRED, ECB
  'economic-calendar', // FRED, Fed, ECB, EC
  'crypto', // CoinGecko / CoinPaprika (license audit before M5)
  'markets-news',
  'economic-news',
  'centralbanks',
] as const;

/** Quote-fed panels (Finnhub / Alpha Vantage / Yahoo / TradingView): desk only. */
export const QUOTE_PANEL_IDS = [
  'markets',
  'commodities',
  'fx',
  'macro-signals',
  'earnings-calendar',
  'etf-flows',
  'market-breadth',
  'fear-greed',
] as const;

export function marketQuotesEnabled(flag: string | undefined): boolean {
  return flag === '1';
}

export function forkFinancePanels(
  upstream: Record<string, PanelConfig>,
  quotesEnabled: boolean,
): Record<string, PanelConfig> {
  const ids: readonly string[] = quotesEnabled ? [...PUBLIC_PANEL_IDS, ...QUOTE_PANEL_IDS] : PUBLIC_PANEL_IDS;
  const out: Record<string, PanelConfig> = {};
  for (const id of ids) {
    const config = upstream[id];
    if (config) out[id] = { ...config, enabled: true };
  }
  return out;
}

/** World-context layers on; AIS, flights and military stay off (relay removed). */
export function forkFinanceMapLayers(upstream: MapLayers): MapLayers {
  return { ...upstream, conflicts: true, hotspots: true, ais: false, flights: false, military: false };
}

const QUOTES_FLAG = (() => {
  try {
    return import.meta.env.VITE_MARKET_QUOTES as string | undefined;
  } catch {
    return undefined;
  }
})();

export const MARKET_QUOTES_ENABLED = marketQuotesEnabled(QUOTES_FLAG);
