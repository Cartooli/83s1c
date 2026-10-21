// 83s1c fork-owned footer and menu links: AGPL Appropriate Legal Notices plus
// the §13 source offer (SPEC §3). Copyright years match LICENSE / README.
import { BRAND, sourceUrlForBuild } from '@/config/brand';

/** Upstream copyright years from LICENSE: Copyright (C) 2024-2026 Elie Habib */
export const UPSTREAM_COPYRIGHT_YEARS = '2024-2026';

/**
 * One-line AGPL Appropriate Legal Notices (§0 / §5(d)), merged with the existing
 * "Based on World Monitor" attribution. `sourceHref` is the clickable Source
 * target (commit-pinned when a build hash is available).
 */
export function forkLegalNoticeHtml(sourceHref: string = BRAND.sourceUrl): string {
  return [
    `© ${UPSTREAM_COPYRIGHT_YEARS} Elie Habib and World Monitor contributors.`,
    'Modified by Cartooli.',
    `<a href="${BRAND.upstreamUrl}" target="_blank" rel="noopener">Based on ${BRAND.upstreamName}</a>.`,
    `Licensed under <a href="${BRAND.licenseUrl}" target="_blank" rel="noopener">AGPL-3.0</a>, with no warranty.`,
    `<a href="${sourceHref}" target="_blank" rel="noopener">Source</a>: ${BRAND.sourceUrl}`,
  ].join(' ');
}

function buildSourceHref(): string {
  const hash = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev';
  return sourceUrlForBuild(hash);
}

/** Legal notice shown in the dashboard footer, mobile menu, and quick-read views. */
export function forkAttributionLinksHtml(): string {
  return forkLegalNoticeHtml(buildSourceHref());
}

export function forkFooterHtml(): string {
  return `
        <div class="site-footer-brand">
          <div class="site-footer-brand-text">
            <span class="site-footer-name">${BRAND.name.toUpperCase()}</span>
            <span class="site-footer-sub">v${__APP_VERSION__}</span>
          </div>
        </div>
        <nav aria-label="${BRAND.name} copyright and license" class="site-footer-legal">${forkAttributionLinksHtml()}</nav>`;
}
