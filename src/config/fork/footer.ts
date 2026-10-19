// 83s1c fork-owned footer and menu links: attribution plus the AGPL source offer (SPEC §3).
import { BRAND, sourceUrlForBuild } from '@/config/brand';

export function forkAttributionLinksHtml(): string {
  return [
    `<span>${BRAND.name}</span>`,
    `<a href="${BRAND.upstreamUrl}" target="_blank" rel="noopener">Based on ${BRAND.upstreamName}</a> (AGPL-3.0)`,
    `<a href="${sourceUrlForBuild(__BUILD_HASH__)}" target="_blank" rel="noopener">Source</a>`,
    `<a href="${BRAND.licenseUrl}" target="_blank" rel="noopener">License</a>`,
  ].join(' &middot; ');
}

export function forkFooterHtml(): string {
  return `
        <div class="site-footer-brand">
          <div class="site-footer-brand-text">
            <span class="site-footer-name">${BRAND.name.toUpperCase()}</span>
            <span class="site-footer-sub">v${__APP_VERSION__}</span>
          </div>
        </div>
        <nav aria-label="${BRAND.name} source and license">${forkAttributionLinksHtml()}</nav>`;
}
