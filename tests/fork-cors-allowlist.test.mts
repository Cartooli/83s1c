// 83s1c fork: the sebuf gateway's CORS allowlist (server/cors.ts) trusts only our hosts.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCorsHeaders, isAllowedOrigin } from '../server/cors.ts';

const req = (origin: string) => new Request('https://83s1c.online/api/x/v1/y', { headers: { Origin: origin } });

describe('fork gateway CORS allowlist', () => {
  it('allows the apex, www and team-pinned previews', () => {
    for (const origin of [
      'https://83s1c.online',
      'https://www.83s1c.online',
      'https://83s1c-git-main-dwellchecker.vercel.app',
      'https://83s1c-abc123-dwellchecker.vercel.app',
    ]) {
      assert.equal(isAllowedOrigin(origin), true, origin);
      assert.equal(getCorsHeaders(req(origin))['Access-Control-Allow-Origin'], origin);
    }
  });

  it('refuses look-alikes, other Vercel teams, upstream and desktop origins', () => {
    for (const origin of [
      'https://83s1c.online.evil.com',
      'https://evil83s1c.online',
      'http://83s1c.online',
      'https://x.vercel.app',
      'https://83s1c-git-main-otherteam.vercel.app',
      'https://worldmonitor.app',
      'https://finance.worldmonitor.app',
      'https://worldmonitor-git-main-eliewm.vercel.app',
      'tauri://localhost',
    ]) {
      assert.equal(isAllowedOrigin(origin), false, origin);
      assert.notEqual(getCorsHeaders(req(origin))['Access-Control-Allow-Origin'], origin, origin);
    }
  });
});
