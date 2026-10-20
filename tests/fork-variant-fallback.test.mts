// 83s1c fork: SITE_VARIANT must honour the build variant on hosts upstream does not
// enumerate (83s1c.online, our previews). Upstream fell back to 'full' there.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { before, describe, it } from 'node:test';
import { build } from 'esbuild';

const root = resolve(import.meta.dirname, '..');
let bundled = '';

before(async () => {
  const result = await build({
    entryPoints: [resolve(root, 'src/config/variant.ts')],
    bundle: true,
    define: { 'import.meta.env': '{"VITE_VARIANT":"finance"}' },
    format: 'esm',
    platform: 'node',
    alias: { '@': resolve(root, 'src') },
    logLevel: 'silent',
    write: false,
  });
  bundled = result.outputFiles[0]!.text;
});

let seq = 0;
async function variantOn(hostname: string): Promise<string> {
  (globalThis as { window?: unknown }).window = { location: { hostname } };
  try {
    const url = `data:text/javascript;base64,${Buffer.from(`${bundled}\n// ${seq++}`).toString('base64')}`;
    return ((await import(url)) as { SITE_VARIANT: string }).SITE_VARIANT;
  } finally {
    delete (globalThis as { window?: unknown }).window;
  }
}

describe('fork variant fallback', () => {
  it('uses the build variant on the production apex', async () => {
    assert.equal(await variantOn('83s1c.online'), 'finance');
  });
  it('uses the build variant on a Vercel preview host', async () => {
    assert.equal(await variantOn('83s1c-git-main-dwellchecker.vercel.app'), 'finance');
  });
  it('keeps upstream prefix routing for enumerated variant hosts', async () => {
    assert.equal(await variantOn('tech.example.com'), 'tech');
  });
});
