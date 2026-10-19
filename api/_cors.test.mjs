import { strict as assert } from 'node:assert';
import test from 'node:test';
import { getCorsHeaders, getPublicCorsHeaders, getOriginDeniedCorsHeaders, isDisallowedOrigin } from './_cors.js';

function makeRequest(origin) {
  const headers = new Headers();
  if (origin !== null) {
    headers.set('origin', origin);
  }
  return new Request('https://83s1c.online/api/test', { headers });
}

// 83s1c fork: desktop (Tauri) origins were removed from the allowlist with the desktop app.
test('rejects former desktop Tauri origins', () => {
  for (const origin of ['https://tauri.localhost', 'https://abc123.tauri.localhost', 'tauri://localhost', 'asset://localhost']) {
    assert.equal(isDisallowedOrigin(makeRequest(origin)), true, `origin must be rejected: ${origin}`);
  }
});

test('allows the fork app hosts and team-pinned previews with credentials', () => {
  for (const origin of ['https://83s1c.online', 'https://www.83s1c.online', 'https://83s1c-git-main-dwellchecker.vercel.app', 'https://83s1c-abc123-dwellchecker.vercel.app']) {
    const req = makeRequest(origin);
    assert.equal(isDisallowedOrigin(req), false, `origin should be allowed: ${origin}`);
    const cors = getCorsHeaders(req);
    assert.equal(cors['Access-Control-Allow-Origin'], origin);
    assert.equal(cors['Access-Control-Allow-Credentials'], 'true');
  }
});

test('rejects look-alikes of the fork hosts and any other Vercel team', () => {
  for (const origin of [
    'https://83s1c.online.evil.com', 'https://evil83s1c.online', 'http://83s1c.online',
    'https://x.vercel.app', 'https://83s1c-git-main-otherteam.vercel.app', 'https://83s1c.vercel.app',
    'https://worldmonitor.app', 'https://worldmonitor-git-main-eliewm.vercel.app',
  ]) {
    const req = makeRequest(origin);
    assert.equal(isDisallowedOrigin(req), true, `must reject ${origin}`);
    assert.notEqual(getCorsHeaders(req)['Access-Control-Allow-Origin'], origin, `must not echo ${origin}`);
  }
});

test('allows Google Translate proxy origins of 83s1c.online (#6411)', () => {
  const origins = [
    'https://www-83s1c-online.translate.goog',
    'https://83s1c-online.translate.goog',
  ];

  for (const origin of origins) {
    const req = makeRequest(origin);
    assert.equal(isDisallowedOrigin(req), false, `translate origin should be allowed: ${origin}`);
    const cors = getCorsHeaders(req);
    assert.equal(cors['Access-Control-Allow-Origin'], origin);
    assert.equal(cors['Access-Control-Allow-Credentials'], 'true');
  }
});

test('rejects unrelated translate.goog hosts', () => {
  const rejected = [
    'https://evil-example-com.translate.goog',
    // Google encodes literal hyphens as `--`. evil-worldmonitor.app must NOT
    // match a naive *-worldmonitor-app.translate.goog suffix check (#6411).
    'https://evil--worldmonitor-app.translate.goog',
    'https://notworldmonitor-app.translate.goog',
  ];
  for (const origin of rejected) {
    assert.equal(isDisallowedOrigin(makeRequest(origin)), true, `must reject ${origin}`);
  }
});

test('allows trailing-dot FQDN form of first-party origins (#6411)', () => {
  const origins = [
    'https://83s1c.online.',
    'https://83s1c.online.',
    'https://www.83s1c.online.',
  ];

  for (const origin of origins) {
    const req = makeRequest(origin);
    assert.equal(isDisallowedOrigin(req), false, `FQDN origin should be allowed: ${origin}`);
    // ACAO must echo the raw Origin (including the trailing dot) — browsers
    // compare byte-for-byte against the request Origin.
    const cors = getCorsHeaders(req);
    assert.equal(cors['Access-Control-Allow-Origin'], origin);
  }
});

test('rejects trailing-dot form of unrelated origins', () => {
  const req = makeRequest('https://evil.example.com.');
  assert.equal(isDisallowedOrigin(req), true);
});

test('rejects unrelated external origins', () => {
  const req = makeRequest('https://evil.example.com');
  assert.equal(isDisallowedOrigin(req), true);
  const cors = getCorsHeaders(req);
  assert.equal(cors['Access-Control-Allow-Origin'], 'https://83s1c.online');
  assert.equal(cors['Access-Control-Allow-Credentials'], 'true');
});

test('getOriginDeniedCorsHeaders echoes the refused Origin so the client can read 403 (#6411)', () => {
  const origin = 'https://evil.example.com';
  const req = makeRequest(origin);
  const denied = getOriginDeniedCorsHeaders(req, 'POST, OPTIONS');
  assert.equal(denied['Access-Control-Allow-Origin'], origin);
  assert.equal(denied['Access-Control-Allow-Credentials'], 'true');
  assert.equal(denied['Access-Control-Allow-Methods'], 'POST, OPTIONS');
  assert.equal(denied['Vary'], 'Origin');
});

test('requests without origin remain allowed', () => {
  const req = makeRequest(null);
  assert.equal(isDisallowedOrigin(req), false);
});

test('CORS allow headers include MCP transport headers', () => {
  const privateCors = getCorsHeaders(makeRequest('https://83s1c.online'));
  const publicCors = getPublicCorsHeaders('POST, GET, OPTIONS');

  for (const cors of [privateCors, publicCors]) {
    const allowed = cors['Access-Control-Allow-Headers'];
    assert.match(allowed, /\bMcp-Session-Id\b/);
    assert.match(allowed, /\bMCP-Protocol-Version\b/);
    assert.match(allowed, /\bLast-Event-ID\b/);

    const exposed = cors['Access-Control-Expose-Headers'];
    assert.match(exposed, /\bMcp-Session-Id\b/);
    assert.match(exposed, /\bWWW-Authenticate\b/);
    assert.match(exposed, /\bRetry-After\b/);
    // IETF RateLimit fields so browser-context agents can self-throttle cross-origin.
    assert.match(exposed, /\bRateLimit-Policy\b/);
    assert.match(exposed, /\bRateLimit-Limit\b/);
    assert.match(exposed, /\bRateLimit-Remaining\b/);
    assert.match(exposed, /\bRateLimit-Reset\b/);
    // Bare combined member: match RateLimit NOT preceded by "-" (so it doesn't
    // just re-match the RateLimit-* fields above) and followed by a delimiter.
    assert.match(exposed, /(^|[\s,])RateLimit(,|$)/);
    assert.match(exposed, /\bX-RateLimit-Limit\b/);
    assert.match(exposed, /\bX-RateLimit-Remaining\b/);
    assert.match(exposed, /\bX-RateLimit-Reset\b/);
    assert.match(exposed, /\bX-RateLimit-Mode\b/);
    assert.match(exposed, /\bX-WorldMonitor-Bbox\b/);
    assert.match(exposed, /\bX-WorldMonitor-Bbox-Missing\b/);
    assert.match(exposed, /\bX-WorldMonitor-Bbox-Invalid\b/);
    assert.match(exposed, /\bX-Military-Bbox\b/);
  }
});
