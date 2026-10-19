// 83s1c fork: SECURITY-AND-LICENSE §4 gates 1, 2 and 9, proven by running the real
// handlers with every secret unset. Routes that need a missing secret must refuse
// (401/403/404/503), never allow. Modules are imported only after the env is cleared.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { after, before, describe, it } from 'node:test';

const root = resolve(import.meta.dirname, '..');
const SECRETISH = /(SECRET|KEY|TOKEN|PASSWORD|KEYS|DSN)/;
const VENDOR = /^(UPSTASH|CONVEX|CLERK|DODO|RESEND|WS_RELAY|RELAY|WORLDMONITOR|FINNHUB|ALPHA_VANTAGE|FRED|EIA)/;
const saved = { ...process.env };
const realFetch = globalThis.fetch;
const outbound: string[] = [];

before(() => {
  for (const key of Object.keys(process.env)) if (SECRETISH.test(key) || VENDOR.test(key)) delete process.env[key];
  process.env.NODE_ENV = 'production';
  globalThis.fetch = (async (input: string | URL | Request) => {
    outbound.push(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    throw new Error('outbound fetch blocked in fail-closed test');
  }) as typeof fetch;
});
after(() => {
  globalThis.fetch = realFetch;
  for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
  Object.assign(process.env, saved);
});

const ORIGIN = 'https://83s1c.online';
type Handler = (req: Request, ctx?: unknown) => Promise<Response> | Response;
async function handlerOf(file: string): Promise<Handler> {
  const mod = await import(pathToFileURL(resolve(root, file)).href);
  return mod.default as Handler;
}
function req(path: string, init: RequestInit = {}): Request {
  return new Request(`${ORIGIN}${path}`, { ...init, headers: { origin: ORIGIN, ...(init.headers ?? {}) } });
}
const REFUSED = new Set([401, 403, 404, 405, 503]);
const ctx = { waitUntil() {} };

describe('fail-closed: MCP (gate 2)', () => {
  it('POST /api/mcp tools/call without WORLDMONITOR_VALID_KEYS returns 401', async () => {
    const mcp = await handlerOf('api/mcp.ts');
    const res = await mcp(req('/api/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_world_brief', arguments: {} } }),
    }), ctx);
    assert.equal(res.status, 401);
  });
});

describe('fail-closed: premium RPC', () => {
  it('a premium market RPC without credentials is refused', async () => {
    const gateway = await handlerOf('api/market/v1/[rpc].ts');
    const res = await gateway(req('/api/market/v1/analyze-stock?symbol=AAPL'), ctx);
    assert.ok([401, 403].includes(res.status), `got ${res.status}`);
  });
});

describe('fail-closed: removed surfaces are unreachable (middleware)', () => {
  it('every removed prefix answers 404 before its handler', async () => {
    const { REMOVED_API_PREFIXES } = await import('../src/config/fork/removed-routes.ts');
    const middleware = (await import('../middleware.ts')).default as (r: Request) => Response | undefined;
    for (const prefix of REMOVED_API_PREFIXES) {
      const path = prefix.endsWith('/') ? `${prefix}x` : prefix;
      const res = middleware(req(path));
      assert.equal(res?.status, 404, path);
    }
  });

  it('lets /source through to its vercel.json rewrite', async () => {
    const middleware = (await import('../middleware.ts')).default as (r: Request) => Response | undefined;
    assert.equal(middleware(req('/source')), undefined);
  });

  it('does not block the routes the dashboard needs', async () => {
    const { isRemovedApiPath } = await import('../src/config/fork/removed-routes.ts');
    for (const path of ['/api/bootstrap', '/api/wm-session', '/api/rss-proxy', '/api/mcp', '/api/health',
      '/api/youtube/embed', '/api/fork/source', '/api/market/v1/list-crypto-quotes', '/api/users-public', '/api/notifyx']) {
      assert.equal(isRemovedApiPath(path), false, path);
    }
  });
});

describe('fail-closed: every remaining secret-reading route (gate 1)', () => {
  // Routes under api/ that read a secret-like env var directly, minus those the
  // middleware removes. With secrets unset and no credentials, none may answer 2xx/3xx.
  const files = (process.env.FORK_SECRET_ROUTES ?? readFileSync(resolve(root, 'scripts/fork/secret-routes.txt'), 'utf8'))
    .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

  it('lists the routes it checks', () => assert.ok(files.length >= 2));

  for (const file of files) {
    it(`${file} refuses without secrets`, async () => {
      const handler = await handlerOf(file);
      const path = `/${file.replace(/\.(ts|js)$/, '')}`;
      for (const method of ['GET', 'POST']) {
        const res = await handler(req(path, {
          method,
          headers: { 'content-type': 'application/json' },
          body: method === 'POST' ? '{}' : undefined,
        }), ctx);
        assert.ok(res.status >= 400, `${method} ${path} answered ${res.status}`);
      }
    });
  }
});

describe('SSRF: rss-proxy only fetches allow-listed feed hosts (gate 9)', () => {
  // An authenticated (anonymous-session) caller: SSRF must hold even past the key gate.
  // The signing secret is random per run, never a real credential.
  let sessionKey = '';
  before(async () => {
    process.env.WM_SESSION_SECRET = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
    const { issueSessionToken } = await import('../api/_session.js');
    sessionKey = (await issueSessionToken()).token;
  });
  after(() => { delete process.env.WM_SESSION_SECRET; });
  const authed = (path: string) => req(path, { headers: { 'X-WorldMonitor-Key': sessionKey } });

  it('refuses an unauthenticated caller before any fetch', async () => {
    const rss = await handlerOf('api/rss-proxy.js');
    outbound.length = 0;
    const res = await rss(req(`/api/rss-proxy?url=${encodeURIComponent('https://feeds.bbci.co.uk/news/world/rss.xml')}`), ctx);
    assert.equal(res.status, 401);
    assert.deepEqual(outbound, []);
  });

  for (const target of ['http://169.254.169.254/latest/meta-data/', 'http://localhost/', 'http://127.0.0.1:8080/', 'https://evil.example.com/feed.xml']) {
    it(`refuses ${target}`, async () => {
      const rss = await handlerOf('api/rss-proxy.js');
      outbound.length = 0;
      const res = await rss(authed(`/api/rss-proxy?url=${encodeURIComponent(target)}`), ctx);
      assert.ok(REFUSED.has(res.status) || res.status === 400, `status ${res.status}`);
      assert.deepEqual(outbound.filter((u) => u.startsWith(target.slice(0, 20))), [], 'must not fetch the target');
    });
  }

  it('control: an allow-listed feed host is attempted, so the refusals above are the allowlist', async () => {
    const rss = await handlerOf('api/rss-proxy.js');
    outbound.length = 0;
    const target = 'https://feeds.bbci.co.uk/news/world/rss.xml';
    await rss(authed(`/api/rss-proxy?url=${encodeURIComponent(target)}`), ctx);
    assert.ok(outbound.some((u) => u.startsWith('https://feeds.bbci.co.uk/')), `outbound: ${JSON.stringify(outbound)}`);
  });
});
