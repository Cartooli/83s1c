// 83s1c fork-owned build plugin: finishes the rebrand of HTML <head> metadata that
// upstream's htmlVariantPlugin leaves pointing at World Monitor (author, twitter handles,
// hreflang alternates, JSON-LD, absolute worldmonitor.app URLs). It only rewrites
// <title>, <meta>, <link> and JSON-LD blocks, never executable inline scripts, so the
// CSP script hashes in vercel.json stay valid.
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { BRAND } from '../brand';

const UPSTREAM_ORIGIN = /https:\/\/(?:(?:www|app|api|tech|finance|commodity|happy|energy)\.)?worldmonitor\.app/g;
const UPSTREAM_NAME = /(?:World ?Monitor|Finance Monitor)/g;

function rebrandTag(tag: string): string {
  return tag.replace(UPSTREAM_ORIGIN, BRAND.origin).replace(UPSTREAM_NAME, BRAND.name);
}

export function rebrandHead(html: string): string {
  const headEnd = html.indexOf('</head>');
  if (headEnd === -1) return html;
  let head = html.slice(0, headEnd);
  const rest = html.slice(headEnd);
  head = head
    .replace(/\s*<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*\/?>/g, '')
    .replace(/\s*<meta name="twitter:(?:site|creator)" content="[^"]*"\s*\/?>/g, '')
    .replace(/<meta name="author" content="[^"]*"/g, `<meta name="author" content="${BRAND.name}"`)
    .replace(/<title>[^<]*<\/title>/g, rebrandTag)
    .replace(/<meta\b[^>]*>/g, rebrandTag)
    .replace(/<link\b[^>]*>/g, rebrandTag);
  return head + rest;
}

const SUMMARY = `${BRAND.name} is a real-time markets and world-events dashboard: macro and rates data, `
  + 'economic calendar, news and official live video beside a world map of conflicts, sanctions, '
  + 'chokepoints, weather and outages. Every number links to its source.';

const ATTRIBUTION = `<a href="${BRAND.upstreamUrl}">Based on ${BRAND.upstreamName}</a> (AGPL-3.0) · `
  + '<a href="/source">Source</a>';

/**
 * Outside <script> blocks only: links to upstream pages go to the upstream repository
 * (attribution) and bare upstream host mentions become ours. Scripts are left untouched
 * so inline-script CSP hashes stay valid.
 */
export function rebrandLinks(html: string): string {
  return html.split(/(<script\b[\s\S]*?<\/script>)/).map((part) => (part.startsWith('<script')
    ? part
    : part
      .replace(/href="https:\/\/(?:www\.)?worldmonitor\.app\/[^"]+"/g, `href="${BRAND.upstreamUrl}"`)
      .replace(UPSTREAM_ORIGIN, BRAND.origin)
      .replace(/\bworldmonitor\.app\b/g, new URL(BRAND.origin).host))).join('');
}

/** Replaces upstream's static SEO copy, noscript block and skeleton brand in <body>. */
export function rebrandBody(html: string): string {
  return html
    .replace(/<h1 class="app-heading">[^<]*<\/h1>/, `<h1 class="app-heading">${BRAND.name} — Markets and World Intelligence Dashboard</h1>`)
    .replace(/<section class="app-seo-summary">[\s\S]*?<\/section>/, `<section class="app-seo-summary">\n      <p>${SUMMARY}</p>\n    </section>`)
    .replace(/<noscript>\s*<main id="dashboard-noscript"[\s\S]*?<\/noscript>/, `<noscript>
      <main id="dashboard-noscript" class="dashboard-noscript">
        <h2>${BRAND.name} requires JavaScript for the live map</h2>
        <p>${SUMMARY}</p>
        <p>${ATTRIBUTION}</p>
      </main>
    </noscript>`)
    .replace(/aria-label="World Monitor dashboard loading"/, `aria-label="${BRAND.name} dashboard loading"`)
    .replace(/(<span class="skeleton-brand-mark" aria-hidden="true"><\/span><span>)World Monitor(<\/span>)/, `$1${BRAND.name}$2`);
}

/**
 * Upstream static files copied from public/ that belong to removed surfaces (SEO corpus,
 * docs site, hosted agent/MCP discovery, Pro pricing, upstream robots variants). They
 * describe and link to worldmonitor.app, so the fork build does not ship them.
 */
export const PRUNED_PUBLIC_PATHS = [
  'sitemap.xml', 'sitemap-main.xml', 'schemamap.xml',
  'llms.txt', 'llms-full.txt', 'api/llms.txt', 'api/download.md', 'developers',
  'agent', 'agent.txt', 'agent-view.json', 'agents.md', 'ai-search.md', 'home.md',
  'world-monitor.md', 'support.md', 'mcp-server.md', 'developers.md', 'sdks.md', 'auth.md',
  'pricing.md', 'api-versioning.md', 'openapi.md', 'openapi.yaml', 'openapi.json',
  'product-facts.json', 'plugin.json', 'trust', 'sandbox',
  'robots.www.txt', 'robots.api.txt', 'robots.variant.txt',
] as const;

export function forkBrandHtmlPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'fork-brand-html',
    enforce: 'post',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      for (const path of PRUNED_PUBLIC_PATHS) rmSync(resolve(outDir, path), { recursive: true, force: true });
    },
    transformIndexHtml: {
      order: 'post',
      // Every page's <head> is rebranded; only the dashboard entry gets the body copy.
      handler: (html: string, ctx: { filename: string }) => {
        const head = rebrandLinks(rebrandHead(html));
        return ctx.filename.endsWith('/index.html') ? rebrandBody(head) : head;
      },
    },
  };
}
