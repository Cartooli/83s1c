// 83s1c fork-owned: /brief entry. Headline + source + time + link only; no article text.
import './views.css';
import { loadBrief, loadLeadSummary } from './brief-data';
import type { BriefItem } from './brief-model';
import { setTrustedHtml, trustedHtml } from '@/utils/dom-utils';
import { escapeHtml, initTheme, timeLabel, viewFooterHtml, viewSwitcherHtml } from './shell';

function meta(i: BriefItem): string {
  const t = timeLabel(i.publishedAt);
  return `<p class="v83-meta">${escapeHtml(i.source)}${t ? ` · <time>${t}</time>` : ''}</p>`;
}

function story(i: BriefItem, cls: string, tag = 'h3'): string {
  return `<article class="${cls}"><${tag}><a href="${escapeHtml(i.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(i.title)}</a></${tag}>${meta(i)}</article>`;
}

async function main(): Promise<void> {
  const app = document.getElementById('app')!;
  const today = new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  setTrustedHtml(app, trustedHtml(`
    <header class="v83-top">${viewSwitcherHtml('/brief')}<button type="button" class="v83-theme"></button></header>
    <main class="brief">
      <div class="brief-flag"><span class="brief-name">83s1c</span><span class="brief-kicker">Daily Brief</span><span class="brief-date">${escapeHtml(today)}</span></div>
      <div id="brief-body" aria-live="polite"><p class="v83-empty">Loading today's headlines…</p></div>
    </main>
    ${viewFooterHtml()}`, 'brief: escaped digest fields'));
  initTheme(app.querySelector('.v83-theme')!);

  const body = document.getElementById('brief-body')!;
  const fetchImpl: typeof fetch = (...a) => globalThis.fetch(...a);
  const { layout, failed } = await loadBrief(fetchImpl);
  if (!layout.lead) {
    setTrustedHtml(body, trustedHtml(`<p class="v83-empty">Headlines unavailable: the news digest${failed.length ? ' did not respond' : ' returned no items'}. Try again shortly.</p>`, 'brief: escaped digest fields'));
    return;
  }
  setTrustedHtml(body, trustedHtml(`
    <section class="brief-front">
      <div class="brief-lead">${story(layout.lead, 'brief-lead-story', 'h2')}<p class="brief-summary" hidden></p></div>
      <div class="brief-secondary">${layout.secondary.map((i) => story(i, 'brief-second')).join('')}</div>
    </section>
    <div class="brief-sections">${layout.sections
      .map(
        (s) => `<section class="brief-section"><h2>${s.title}</h2>${
          s.items.length ? s.items.map((i) => story(i, 'brief-item')).join('') : '<p class="v83-empty">Unavailable: no current headlines in this section.</p>'
        }</section>`,
      )
      .join('')}</div>`, 'brief: escaped digest fields'));

  const summary = await loadLeadSummary(fetchImpl, layout.lead.title);
  const el = body.querySelector<HTMLElement>('.brief-summary')!;
  if (summary) {
    el.textContent = `AI summary: ${summary}`;
    el.hidden = false;
  }
}

void main();
