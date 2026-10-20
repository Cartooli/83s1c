// 83s1c fork: quote-fed panels must never reach the public deployment (00-RUN Decisions §2).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  forkFinanceMapLayers,
  forkFinancePanels,
  marketQuotesEnabled,
  PUBLIC_PANEL_IDS,
  QUOTE_PANEL_IDS,
} from '../src/config/fork/finance-panels.ts';
import type { MapLayers, PanelConfig } from '../src/types/index.ts';

const upstream: Record<string, PanelConfig> = Object.fromEntries(
  [...PUBLIC_PANEL_IDS, ...QUOTE_PANEL_IDS, 'stock-analysis', 'heatmap', 'gulf-economies'].map((id) => [
    id,
    { name: id, enabled: false, priority: 1 } as PanelConfig,
  ]),
);

describe('fork finance panel set', () => {
  it('treats only the exact string "1" as quotes-enabled', () => {
    for (const value of [undefined, '', '0', 'true', 'yes', ' 1']) assert.equal(marketQuotesEnabled(value), false, String(value));
    assert.equal(marketQuotesEnabled('1'), true);
  });

  it('public set excludes every quote-fed and premium panel', () => {
    const panels = forkFinancePanels(upstream, false);
    assert.deepEqual(Object.keys(panels), [...PUBLIC_PANEL_IDS]);
    for (const id of [...QUOTE_PANEL_IDS, 'stock-analysis', 'heatmap', 'gulf-economies']) assert.equal(id in panels, false, id);
    assert.ok(Object.values(panels).every((p) => p.enabled));
  });

  it('desk set adds the quote panels and still nothing premium', () => {
    const panels = forkFinancePanels(upstream, true);
    assert.deepEqual(Object.keys(panels), [...PUBLIC_PANEL_IDS, ...QUOTE_PANEL_IDS]);
    assert.equal('stock-analysis' in panels, false);
  });

  it('map keeps world-context layers on and relay layers off', () => {
    const layers = forkFinanceMapLayers({ ais: true, flights: true, military: true, conflicts: false, hotspots: false } as unknown as MapLayers);
    assert.equal(layers.conflicts, true);
    assert.equal(layers.hotspots, true);
    assert.equal(layers.ais, false);
    assert.equal(layers.flights, false);
    assert.equal(layers.military, false);
  });
});
