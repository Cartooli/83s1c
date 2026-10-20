// 83s1c fork-owned: Daily Brief data. Existing news RPCs only, same-origin.
import { NewsServiceClient } from '../../../generated/client/worldmonitor/news/v1/service_client.ts';
import { BRIEF_VARIANTS, buildBrief, mergeDigests, type BriefLayout, type DigestBuckets } from './brief-model.ts';

export interface BriefData {
  layout: BriefLayout;
  /** Variants whose digest failed; shown as the "unavailable" reason. */
  failed: string[];
}

export async function loadBrief(fetchImpl: typeof fetch, baseUrl = ''): Promise<BriefData> {
  const client = new NewsServiceClient(baseUrl, { fetch: fetchImpl });
  const failed: string[] = [];
  const results = await Promise.all(
    BRIEF_VARIANTS.map((variant) =>
      client.listFeedDigest({ variant, lang: 'en' }).then(
        (r) => [variant, (r.categories ?? {}) as DigestBuckets] as const,
        () => {
          failed.push(variant);
          return [variant, {}] as const;
        },
      ),
    ),
  );
  return { layout: buildBrief(mergeDigests(Object.fromEntries(results))), failed };
}

/**
 * One-line summary of the lead story. The server answers with an empty summary when
 * no LLM key is configured; any failure or empty answer means "omit", never a placeholder.
 */
export async function loadLeadSummary(fetchImpl: typeof fetch, headline: string, baseUrl = ''): Promise<string> {
  const client = new NewsServiceClient(baseUrl, { fetch: fetchImpl });
  try {
    const r = await client.summarizeArticle({
      provider: 'openrouter',
      headlines: [headline],
      mode: 'brief',
      geoContext: '',
      variant: 'finance',
      lang: 'en',
      systemAppend: '',
      bodies: [],
    });
    return r.error || r.fallback ? '' : (r.summary.trim().split('\n')[0] ?? '');
  } catch {
    return '';
  }
}
