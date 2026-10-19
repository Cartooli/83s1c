// 83s1c fork-owned build plugin: finishes the rebrand of HTML <head> metadata that
// upstream's htmlVariantPlugin leaves pointing at World Monitor (author, twitter handles,
// hreflang alternates, JSON-LD, absolute worldmonitor.app URLs). It only rewrites
// <title>, <meta>, <link> and JSON-LD blocks, never executable inline scripts, so the
// CSP script hashes in vercel.json stay valid.
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
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
    .replace(/\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*\/?>/g, '')
    .replace(/\s*<meta name="twitter:(?:site|creator)" content="[^"]*"\s*\/?>/g, '')
    .replace(/<meta name="author" content="[^"]*"/g, `<meta name="author" content="${BRAND.name}"`)
    .replace(/<title>[^<]*<\/title>/g, rebrandTag)
    .replace(/<meta\b[^>]*>/g, rebrandTag)
    .replace(/<link\b[^>]*>/g, rebrandTag);
  return head + rest;
}

export function forkBrandHtmlPlugin(): Plugin {
  return {
    name: 'fork-brand-html',
    enforce: 'post',
    transformIndexHtml: { order: 'post', handler: rebrandHead },
  };
}
