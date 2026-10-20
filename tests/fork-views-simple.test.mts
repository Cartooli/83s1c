// 83s1c fork: Simple mode shows 6-8 open-data panels, never a quote panel.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PUBLIC_PANEL_IDS, QUOTE_PANEL_IDS } from '../src/config/fork/finance-panels.ts';
import { SIMPLE_PANELS, simpleModeCss } from '../src/config/fork/views/simple-mode.ts';

describe('fork Simple mode', () => {
  it('has 6-8 core panels, all public and none quote-fed', () => {
    assert.ok(SIMPLE_PANELS.length >= 6 && SIMPLE_PANELS.length <= 8);
    for (const p of SIMPLE_PANELS) {
      assert.ok((PUBLIC_PANEL_IDS as readonly string[]).includes(p.id), p.id);
      assert.ok(!(QUOTE_PANEL_IDS as readonly string[]).includes(p.id), p.id);
      assert.ok(p.label && p.note.length > 20, p.id);
    }
  });

  it('CSS hides every panel except the core set, only under the root class', () => {
    const css = simpleModeCss();
    assert.match(css, /^html\.v83-simple \[data-panel\]/);
    for (const p of SIMPLE_PANELS) assert.ok(css.includes(`:not([data-panel="${p.id}"])`), p.id);
    for (const id of QUOTE_PANEL_IDS) assert.ok(!css.includes(`"${id}"`), id);
  });
});
