// 83s1c fork-owned: Terminal data. Existing economic / market / news RPCs only, same-origin.
// The quote RPC is called only when quotesEnabled (the desk deployment).
import { EconomicServiceClient } from '../../../generated/client/worldmonitor/economic/v1/service_client.ts';
import { MarketServiceClient } from '../../../generated/client/worldmonitor/market/v1/service_client.ts';
import { NewsServiceClient } from '../../../generated/client/worldmonitor/news/v1/service_client.ts';
import stocks from '../../../../shared/stocks.json';
import type { BriefItem } from './brief-model.ts';
import type { TileId } from './terminal-model.ts';

export const TREASURY_SERIES = ['DGS1MO', 'DGS3MO', 'DGS6MO', 'DGS1', 'DGS2', 'DGS5', 'DGS10', 'DGS30'] as const;
export const TREASURY_LABELS = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y', '30Y'] as const;

export interface Row {
  label: string;
  value: number | null;
  change?: number | null;
  note?: string;
}

/** A tile's rows, or the reason it has none. */
export type TileResult = { rows: Row[]; curve?: { us: (number | null)[]; eu: (number | null)[] } } | { unavailable: string };

export interface TerminalData {
  tiles: Partial<Record<TileId, TileResult>>;
  headlines: BriefItem[];
}

const FAILED = 'Unavailable: the data service did not respond.';
const EMPTY = 'Unavailable: no data has been published yet.';

function settle<T>(p: Promise<T>, map: (v: T) => TileResult): Promise<TileResult> {
  return p.then(map, () => ({ unavailable: FAILED }));
}

const rows = (r: Row[]): TileResult => (r.length ? { rows: r } : { unavailable: EMPTY });

export async function loadTerminal(fetchImpl: typeof fetch, quotesEnabled: boolean, baseUrl = ''): Promise<TerminalData> {
  const opts = { fetch: fetchImpl };
  const econ = new EconomicServiceClient(baseUrl, opts);
  const market = new MarketServiceClient(baseUrl, opts);
  const news = new NewsServiceClient(baseUrl, opts);
  const today = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const fred = econ.getFredSeriesBatch({ seriesIds: [...TREASURY_SERIES], limit: 2 });
  const euCurve = econ.getEuYieldCurve({});

  const [rates, curve, fx, crypto, calendar, quotes, digest] = await Promise.all([
    settle(fred, (r) =>
      rows(
        TREASURY_SERIES.flatMap((id, i) => {
          const obs = r.results?.[id]?.observations ?? [];
          const last = obs[obs.length - 1]?.value;
          const prev = obs[obs.length - 2]?.value;
          return last === undefined ? [] : [{ label: TREASURY_LABELS[i]!, value: last, change: prev === undefined ? null : last - prev }];
        }),
      ),
    ),
    Promise.allSettled([fred, euCurve]).then(([us, eu]): TileResult => {
      const usVals = TREASURY_SERIES.map((id) => {
        const obs = us.status === 'fulfilled' ? (us.value.results?.[id]?.observations ?? []) : [];
        return obs[obs.length - 1]?.value ?? null;
      });
      const euRates = eu.status === 'fulfilled' && !eu.value.unavailable ? (eu.value.data?.rates ?? {}) : {};
      const euVals = TREASURY_LABELS.map((l) => euRates[l] ?? null);
      if (usVals.every((v) => v === null) && euVals.every((v) => v === null)) {
        return { unavailable: us.status === 'rejected' && eu.status === 'rejected' ? FAILED : EMPTY };
      }
      const spread = usVals[6] !== null && usVals[4] !== null ? usVals[6]! - usVals[4]! : null;
      return { rows: [{ label: 'US 2s10s', value: spread, note: 'pp' }], curve: { us: usVals, eu: euVals } };
    }),
    settle(econ.getEcbFxRates({}), (r) =>
      r.unavailable ? { unavailable: EMPTY } : rows((r.rates ?? []).slice(0, 10).map((x) => ({ label: x.pair, value: x.rate }))),
    ),
    settle(market.listCryptoQuotes({ ids: [] }), (r) =>
      rows((r.quotes ?? []).filter((q) => q.price > 0).slice(0, 8).map((q) => ({ label: q.symbol, value: q.price, change: q.change }))),
    ),
    settle(
      econ.getEconomicCalendar({ fromDate: iso(today), toDate: iso(new Date(today.getTime() + 7 * 86_400_000)) }),
      (r) =>
        r.unavailable
          ? { unavailable: EMPTY }
          : rows((r.events ?? []).slice(0, 10).map((e) => ({ label: `${e.date.slice(5, 10)} ${e.country}`, value: null, note: `${e.event}${e.impact ? ` · ${e.impact}` : ''}` }))),
    ),
    quotesEnabled
      ? settle(market.listMarketQuotes({ symbols: stocks.defaultSymbols.slice(0, 10) }), (r) =>
          rows((r.quotes ?? []).map((q) => ({ label: q.display || q.symbol, value: q.price, change: q.change }))),
        )
      : Promise.resolve(null),
    news.listFeedDigest({ variant: 'finance', lang: 'en' }).then(
      (r) => Object.values(r.categories ?? {}).flatMap((b) => (b.items ?? []) as BriefItem[]),
      () => [] as BriefItem[],
    ),
  ]);

  const tiles: TerminalData['tiles'] = { rates, curve, fx, crypto, calendar };
  if (quotes) tiles.quotes = quotes;
  const headlines = digest.filter((h) => /^https?:\/\//i.test(h.link)).sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 30);
  return { tiles, headlines };
}
