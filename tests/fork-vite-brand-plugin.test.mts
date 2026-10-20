// 83s1c fork: the HTML rebrand must remove upstream identity without touching any
// executable inline script (their CSP hashes live in vercel.json).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { rebrandBody, rebrandHead } from '../src/config/fork/vite-brand-plugin.ts';

const source = readFileSync(resolve(import.meta.dirname, '..', 'index.html'), 'utf8');
const out = rebrandBody(rebrandHead(source));
const executableScripts = (html: string) =>
  [...html.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]);

describe('fork HTML rebrand', () => {
  it('leaves executable inline scripts byte-identical', () => {
    assert.deepEqual(executableScripts(out), executableScripts(source));
  });

  it('drops upstream JSON-LD and twitter handles; keeps hreflang alternates on our origin', () => {
    assert.doesNotMatch(out, /application\/ld\+json/);
    const alternates = [...out.matchAll(/<link rel="alternate" hreflang="[^"]*" href="([^"]*)"/g)].map((m) => m[1]);
    assert.ok(alternates.length >= 1, 'upstream variant-dashboard plugin anchors on the hreflang alternates');
    for (const href of alternates) assert.ok(href.startsWith('https://83s1c.online'), href);
    assert.doesNotMatch(out, /twitter:(site|creator)/);
  });

  it('has no upstream name or host outside scripts, except the attribution link', () => {
    let rest = out;
    for (const script of executableScripts(out)) rest = rest.replace(script, '');
    rest = rest.replace('<a href="https://github.com/koala73/worldmonitor">Based on World Monitor</a>', '');
    assert.doesNotMatch(rest, /World ?Monitor|worldmonitor\.app/i);
  });

  it('keeps attribution and the source link in the noscript block', () => {
    assert.match(out, /Based on World Monitor<\/a> \(AGPL-3\.0\)/);
    assert.match(out, /<a href="\/source">Source<\/a>/);
  });
});
