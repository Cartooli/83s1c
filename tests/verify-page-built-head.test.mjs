import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardBuiltOutput, shouldSkipBuiltOutput } from './_lib/built-output-guard.mjs';
import { rebrandHead } from '../src/config/fork/vite-brand-plugin.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const builtVerify = resolve(repoRoot, 'dist/verify.html');

guardBuiltOutput(builtVerify);

function headTags(html) {
  return {
    title: html.match(/<title>(.*?)<\/title>/)?.[1],
    description: html.match(/<meta name="description" content="(.*?)" \/>/)?.[1],
    canonical: html.match(/<link rel="canonical" href="(.*?)" \/>/)?.[1],
  };
}

describe('built /verify page head', { skip: shouldSkipBuiltOutput(builtVerify) }, () => {
  it('keeps its own title, description and canonical instead of the dashboard brand meta', () => {
    const source = headTags(readFileSync(resolve(repoRoot, 'verify.html'), 'utf8'));
    assert.equal(source.canonical, 'https://www.worldmonitor.app/verify');
    // 83s1c fork: the fork brand plugin rebrands every page head, so the built page equals
    // the rebranded source (still its own title/description/canonical, not the dashboard's).
    const expected = headTags(rebrandHead(readFileSync(resolve(repoRoot, 'verify.html'), 'utf8')));
    assert.equal(expected.canonical, 'https://83s1c.online/verify');
    assert.deepEqual(headTags(readFileSync(builtVerify, 'utf8')), expected);
  });
});
