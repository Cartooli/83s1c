import { strict as assert } from 'node:assert';
import test from 'node:test';
import handler, { sourceLocation } from './source.js';

test('source offer points at the deployed commit', () => {
  const sha = 'a'.repeat(40);
  assert.equal(sourceLocation(sha), `https://github.com/Cartooli/83s1c/tree/${sha}`);
});

test('source offer falls back to the repository root for missing or odd SHAs', () => {
  for (const sha of [undefined, '', 'main', '../evil', 'g'.repeat(40)]) {
    assert.equal(sourceLocation(sha), 'https://github.com/Cartooli/83s1c');
  }
});

test('handler redirects without caching', () => {
  const res = handler();
  assert.equal(res.status, 302);
  assert.match(res.headers.get('location'), /^https:\/\/github\.com\/Cartooli\/83s1c/);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});
