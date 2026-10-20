// 83s1c fork-owned: dashboard view controls (switcher + Simple mode toggle).
// Simple mode is presentational: it hides non-core panels with CSS and relabels the core
// ones. It never edits saved panel settings, so switching it off restores the full layout.
import { safeStorageGet, safeStorageSet } from '@/utils/safe-storage';
import type { PUBLIC_PANEL_IDS } from '@/config/fork/finance-panels';

type PublicPanelId = (typeof PUBLIC_PANEL_IDS)[number];

/** Core panels, open data only (a subset of PUBLIC_PANEL_IDS, so never quote-fed). The map is not a [data-panel] and stays visible, with its attribution badge. */
export const SIMPLE_PANELS: readonly { id: PublicPanelId; label: string; note: string }[] = [
  { id: 'markets-news', label: 'Market headlines', note: 'The latest stories moving stocks, bonds and currencies.' },
  { id: 'economic', label: 'The economy at a glance', note: 'Jobs, prices and growth: the basics of how the economy is doing.' },
  { id: 'yield-curve', label: 'Interest rates by loan length', note: 'When short-term rates sit above long-term ones, markets often expect a slowdown.' },
  { id: 'centralbanks', label: 'Central bank news', note: 'Central banks set interest rates, which affect loans, savings and markets.' },
  { id: 'economic-calendar', label: 'Upcoming economic reports', note: 'Scheduled data releases that can move markets when they surprise.' },
  { id: 'crypto', label: 'Cryptocurrency prices', note: 'Prices of major cryptocurrencies. They can swing sharply in a day.' },
];

const STORAGE_KEY = '83s1c-simple-mode';
const ROOT_CLASS = 'v83-simple';

/** CSS that hides every panel except the core ones while the root class is set. */
export function simpleModeCss(): string {
  const keep = SIMPLE_PANELS.map((p) => `:not([data-panel="${p.id}"])`).join('');
  return `html.${ROOT_CLASS} [data-panel]${keep} { display: none !important; }`;
}

export function forkViewControlsHtml(): string {
  return `<nav class="v83-dash-views" aria-label="Views"><a href="/dashboard" aria-current="page">Dashboard</a><a href="/brief">Brief</a><a href="/terminal">Terminal</a><button type="button" class="v83-simple-toggle" aria-pressed="false">Simple</button></nav>`;
}

function decorate(panel: HTMLElement, on: boolean): void {
  const spec = SIMPLE_PANELS.find((p) => p.id === panel.dataset.panel);
  if (!spec) return;
  const title = panel.querySelector<HTMLElement>('.panel-title');
  if (title) {
    if (on && title.dataset.v83Label === undefined) {
      title.dataset.v83Label = title.textContent ?? '';
      title.textContent = spec.label;
    } else if (!on && title.dataset.v83Label !== undefined) {
      title.textContent = title.dataset.v83Label;
      delete title.dataset.v83Label;
    }
  }
  const existing = panel.querySelector(':scope > .v83-simple-note');
  if (on && !existing) {
    const note = document.createElement('p');
    note.className = 'v83-simple-note';
    note.textContent = spec.note;
    panel.querySelector(':scope > .panel-header')?.after(note);
  } else if (!on) existing?.remove();
}

export function initForkViewControls(root: HTMLElement): void {
  const style = document.createElement('style');
  style.textContent = simpleModeCss();
  document.head.appendChild(style);

  const buttons = root.querySelectorAll<HTMLButtonElement>('.v83-simple-toggle');
  let on = safeStorageGet(STORAGE_KEY) === '1';
  const apply = () => {
    document.documentElement.classList.toggle(ROOT_CLASS, on);
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(on)));
    root.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => decorate(p, on));
  };
  // Panels mount after the header and some lazily; decorate them as they arrive.
  new MutationObserver((records) => {
    if (!on) return;
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (!(n instanceof HTMLElement)) return;
        if (n.dataset.panel) decorate(n, true);
        n.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => decorate(p, true));
      });
    }
  }).observe(root, { childList: true, subtree: true });
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      on = !on;
      safeStorageSet(STORAGE_KEY, on ? '1' : '0');
      apply();
    }),
  );
  apply();
}
