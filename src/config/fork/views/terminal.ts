// 83s1c fork-owned: /terminal entry. Dense board; keys 1-7 focus tiles, t theme, r refresh.
import './views.css';
import { INTEL_HOTSPOTS } from '@/config/geo';
import { MARKET_QUOTES_ENABLED } from '@/config/fork/finance-panels';
import { setTrustedHtml, trustedHtml } from '@/utils/dom-utils';
import { escapeHtml, initTheme, timeLabel, viewFooterHtml, viewSwitcherHtml } from './shell';
import { loadTerminal, TREASURY_LABELS, type Row, type TileResult } from './terminal-data';
import { activeHotspots, linePoints, project, terminalTiles, type TileId } from './terminal-model';

const fmt = (v: number | null, digits = 2) =>
  v === null || !Number.isFinite(v) ? '—' : v.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: Math.min(digits, 2) });

function rowHtml(r: Row): string {
  const ch = r.change ?? null;
  const cls = ch === null ? '' : ch >= 0 ? 'up' : 'down';
  const chText = ch === null ? '' : `${ch >= 0 ? '+' : ''}${fmt(ch)}`;
  const val = r.value === null ? '' : fmt(r.value, r.value >= 1000 ? 0 : 4);
  return `<tr><th scope="row">${escapeHtml(r.label)}</th><td>${val}${r.note && r.value !== null ? ` ${escapeHtml(r.note)}` : ''}</td><td class="${cls}">${chText}${r.note && r.value === null ? `<span class="t-note">${escapeHtml(r.note)}</span>` : ''}</td></tr>`;
}

function curveSvg(curve: { us: (number | null)[]; eu: (number | null)[] }): string {
  const w = 280;
  const h = 90;
  const nums = [...curve.us, ...curve.eu].filter((v): v is number => v !== null);
  const scaled = (series: (number | null)[]) => linePoints(series, w, h, Math.min(...nums), Math.max(...nums));
  return `<svg class="t-curve" viewBox="-12 0 ${w + 24} ${h + 14}" role="img" aria-label="US and euro area yield curves">
    <polyline class="us" points="${scaled(curve.us)}" /><polyline class="eu" points="${scaled(curve.eu)}" />
    ${TREASURY_LABELS.map((l, i) => `<text x="${(i * w) / (TREASURY_LABELS.length - 1)}" y="${h + 12}">${l}</text>`).join('')}
  </svg><p class="t-legend"><span class="us">US</span> <span class="eu">EUR</span></p>`;
}

function tileBody(id: TileId, result: TileResult | undefined): string {
  if (!result) return '<p class="v83-empty">Loading…</p>';
  if ('unavailable' in result) return `<p class="v83-empty">${escapeHtml(result.unavailable)}</p>`;
  const table = `<table>${result.rows.map(rowHtml).join('')}</table>`;
  return id === 'curve' && result.curve ? curveSvg(result.curve) + table : table;
}

function hotspotsBody(headlines: string[], loaded: boolean): string {
  if (!loaded) return '<p class="v83-empty">Loading…</p>';
  const active = activeHotspots(INTEL_HOTSPOTS, headlines);
  const w = 360;
  const h = 180;
  const dots = active
    .map((s) => {
      const [x, y] = project(s.lat, s.lon, w, h);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.min(3 + s.mentions, 9)}"><title>${escapeHtml(s.name)}: ${s.mentions}</title></circle>`;
    })
    .join('');
  if (!active.length) {
    return `<p class="v83-empty">Unavailable: ${headlines.length ? 'no hotspot is named in current headlines' : 'the news digest did not respond'}.</p>`;
  }
  const list = `<ol class="t-hot">${active.slice(0, 6).map((s) => `<li>${escapeHtml(s.name)} <span>${s.mentions}</span></li>`).join('')}</ol>`;
  return `<svg class="t-map" viewBox="0 0 ${w} ${h}" role="img" aria-label="Hotspots mentioned in current headlines"><rect width="${w}" height="${h}" />${[-60, -30, 0, 30, 60].map((lat) => `<line x1="0" x2="${w}" y1="${project(lat, 0, w, h)[1]}" y2="${project(lat, 0, w, h)[1]}" />`).join('')}${dots}</svg>${list}`;
}

async function main(): Promise<void> {
  const app = document.getElementById('app')!;
  const tiles = terminalTiles(MARKET_QUOTES_ENABLED);
  const render = (data?: Awaited<ReturnType<typeof loadTerminal>>) => {
    const headlineTitles = data?.headlines.map((h) => h.title) ?? [];
    const ticker = data
      ? data.headlines.length
        ? (() => {
            const items = data.headlines.map((h) => `<a href="${escapeHtml(h.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(h.title)} <span>${escapeHtml(h.source)} ${timeLabel(h.publishedAt)}</span></a>`).join('');
            // Second copy makes the -50% scroll loop seamless; hidden from assistive tech and tab order.
            return `${items}<span class="t-dup" aria-hidden="true" inert>${items}</span>`;
          })()
        : '<span class="v83-empty">Headlines unavailable: the news digest did not respond.</span>'
      : '<span class="v83-empty">Loading headlines…</span>';
    setTrustedHtml(
      app,
      trustedHtml(
        `<header class="v83-top">${viewSwitcherHtml('/terminal')}<span class="t-keys">1-${tiles.length} focus · r refresh · t theme</span><button type="button" class="v83-theme"></button></header>
        <div class="t-ticker" aria-label="Top headlines"><div class="t-ticker-track">${ticker}</div></div>
        <main class="terminal">${tiles
          .map(
            (t, i) => `<section class="t-tile t-${t.id}" tabindex="0" aria-labelledby="t-${t.id}-h"><h2 id="t-${t.id}-h"><kbd>${i + 1}</kbd> ${t.title}<small>${t.source}</small></h2>${
              t.id === 'hotspots' ? hotspotsBody(headlineTitles, Boolean(data)) : tileBody(t.id, data?.tiles[t.id])
            }</section>`,
          )
          .join('')}</main>
        ${viewFooterHtml()}`,
        'terminal: escaped RPC fields',
      ),
    );
    initTheme(app.querySelector('.v83-theme')!);
  };
  const refresh = async () => render(await loadTerminal((...a) => globalThis.fetch(...a), MARKET_QUOTES_ENABLED));

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || (e.target instanceof HTMLElement && e.target.matches('input, textarea'))) return;
    const n = Number(e.key);
    if (n >= 1 && n <= tiles.length) app.querySelectorAll<HTMLElement>('.t-tile')[n - 1]?.focus();
    else if (e.key === 't') app.querySelector<HTMLElement>('.v83-theme')?.click();
    else if (e.key === 'r') void refresh();
  });
  render();
  await refresh();
}

void main();
