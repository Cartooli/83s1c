// 83s1c fork: Terminal quote tiles exist only on the desk, and every request is same-origin.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { activeHotspots, linePoints, terminalTiles } from '../src/config/fork/views/terminal-model.ts';
import { loadTerminal } from '../src/config/fork/views/terminal-data.ts';

function recordingFetch(urls: string[]): typeof fetch {
  return (async (input: string | URL | Request) => {
    urls.push(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

describe('fork Terminal', () => {
  it('has no quote tile when MARKET_QUOTES_ENABLED is false', () => {
    assert.ok(terminalTiles(false).every((t) => !t.quote));
    assert.ok(!terminalTiles(false).some((t) => t.id === 'quotes'));
    assert.ok(terminalTiles(true).some((t) => t.id === 'quotes'));
  });

  it('never calls the quote RPC with quotes disabled, and stays same-origin', async () => {
    const urls: string[] = [];
    const data = await loadTerminal(recordingFetch(urls), false);
    assert.equal(data.tiles.quotes, undefined);
    assert.ok(!urls.some((u) => u.includes('list-market-quotes')), urls.join('\n'));
    assert.ok(urls.length >= 5);
    for (const u of urls) assert.match(u, /^\/api\//, u);
  });

  it('calls the quote RPC only on the desk', async () => {
    const urls: string[] = [];
    const data = await loadTerminal(recordingFetch(urls), true);
    assert.ok(urls.some((u) => u.includes('list-market-quotes')));
    assert.ok(data.tiles.quotes);
    for (const u of urls) assert.match(u, /^\/api\//, u);
  });

  it('every empty tile says why', async () => {
    const data = await loadTerminal((async () => { throw new Error('down'); }) as typeof fetch, false);
    for (const [id, t] of Object.entries(data.tiles)) assert.ok('unavailable' in t! && /^Unavailable: /.test(t.unavailable), id);
  });

  it('ranks hotspots by headline mentions and skips unmentioned ones', () => {
    const spots = [
      { id: 'a', name: 'A', lat: 0, lon: 0, keywords: ['taiwan'] },
      { id: 'b', name: 'B', lat: 0, lon: 0, keywords: ['sahel'] },
      { id: 'c', name: 'C', lat: 0, lon: 0, keywords: ['red sea', 'houthi'] },
    ];
    const r = activeHotspots(spots, ['Taiwan strait drills', 'Houthi strike in Red Sea', 'Red Sea shipping resumes']);
    assert.deepEqual(r.map((s) => [s.id, s.mentions]), [['c', 2], ['a', 1]]);
  });

  it('linePoints skips nulls and honours a shared axis', () => {
    assert.equal(linePoints([1, null, 3], 100, 10), '0.0,10.0 100.0,0.0');
    assert.equal(linePoints([2, 2], 10, 10, 0, 4), '0.0,5.0 10.0,5.0');
  });
});
