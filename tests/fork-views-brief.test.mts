// 83s1c fork: the Daily Brief builds from existing digests and only calls same-origin APIs.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildBrief, mergeDigests } from '../src/config/fork/views/brief-model.ts';
import { loadBrief, loadLeadSummary } from '../src/config/fork/views/brief-data.ts';

const item = (title: string, score = 0, at = 1) => ({ title, source: 'Src', link: `https://ex.test/${title}`, publishedAt: at, importanceScore: score });

function recordingFetch(body: unknown, urls: string[]): typeof fetch {
  return (async (input: string | URL | Request) => {
    urls.push(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

describe('fork Daily Brief', () => {
  it('picks the highest-importance lead and never repeats a story', () => {
    const layout = buildBrief(
      mergeDigests({
        finance: { markets: { items: [item('a', 1), item('b', 9), item('c', 5)] } },
        full: { politics: { items: [item('d', 7), item('b', 9)] }, tech: { items: [item('e', 2)] } },
      }),
    );
    assert.equal(layout.lead?.title, 'b');
    assert.deepEqual(layout.secondary.map((i) => i.title), ['d', 'c', 'e']);
    const all = [layout.lead!, ...layout.secondary, ...layout.sections.flatMap((s) => s.items)].map((i) => i.link);
    assert.equal(new Set(all).size, all.length);
  });

  it('drops items whose link is not http(s)', () => {
    const layout = buildBrief({ 'finance:markets': { items: [{ ...item('x', 9), link: 'javascript:alert(1)' }] } });
    assert.equal(layout.lead, null);
  });

  it('requests only same-origin API paths', async () => {
    const urls: string[] = [];
    const data = await loadBrief(recordingFetch({ categories: { markets: { items: [item('m', 3)] } } }, urls));
    await loadLeadSummary(recordingFetch({ summary: 's' }, urls), 'm');
    assert.equal(data.layout.lead?.title, 'm');
    assert.ok(urls.length >= 3);
    for (const u of urls) assert.match(u, /^\/api\//, u);
  });

  it('omits the AI summary when the server has no LLM key', async () => {
    const urls: string[] = [];
    const none = await loadLeadSummary(recordingFetch({ summary: '', fallback: true, error: 'no credentials' }, urls), 'h');
    assert.equal(none, '');
  });
});

describe('fork view routes', () => {
  it('/brief passes the middleware and has a vercel.json rewrite; unknown paths still 404', async () => {
    const { default: middleware } = await import('../middleware.ts');
    const { readFileSync } = await import('node:fs');
    const html = { headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0 Chrome/130' } };
    assert.equal(middleware(new Request('https://83s1c.online/brief', html)), undefined);
    const miss = middleware(new Request('https://83s1c.online/brieff', html)) as Response;
    assert.equal(miss.status, 404);
    const rewrites = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')).rewrites;
    assert.ok(rewrites.some((r: { source: string; destination: string }) => r.source === '/brief' && r.destination === '/brief.html'));
  });
});

describe('fork view routes: terminal', () => {
  it('/terminal passes the middleware and has a vercel.json rewrite', async () => {
    const { default: middleware } = await import('../middleware.ts');
    const { readFileSync } = await import('node:fs');
    const html = { headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0 Chrome/130' } };
    assert.equal(middleware(new Request('https://83s1c.online/terminal', html)), undefined);
    const rewrites = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')).rewrites;
    assert.ok(rewrites.some((r: { source: string; destination: string }) => r.source === '/terminal' && r.destination === '/terminal.html'));
  });
});
