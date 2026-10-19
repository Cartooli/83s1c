#!/usr/bin/env node
// 83s1c fork: upstream tests send worldmonitor.app as the trusted browser origin.
// The fork's CORS allowlist trusts only 83s1c.online and team-pinned previews, so
// those fixtures are rewritten. Re-run on the listed files after an upstream merge:
//   node scripts/fork/rewrite-test-origins.mjs $(jq -r '.[]' scripts/fork/origin-rewritten-tests.json)
import { readFileSync, writeFileSync } from 'node:fs';

const RULES = [
  // Any upstream app host (apex, www, variant subdomains) -> our apex or www.
  [/https:\/\/www\.worldmonitor\.app/g, 'https://www.83s1c.online'],
  [/https:\/\/(?:(?:app|api|tech|finance|commodity|happy|energy)\.)?worldmonitor\.app/g, 'https://83s1c.online'],
  // Upstream team-pinned Vercel previews -> ours.
  [/worldmonitor-([a-z0-9-]+)-eliewm\.vercel\.app/g, '83s1c-$1-dwellchecker.vercel.app'],
  // Desktop (Tauri) origins are no longer trusted; tests that used them as "an allowed
  // browser origin" now use ours.
  [/(?:https?:\/\/(?:[a-z0-9-]+\.)?tauri\.localhost|tauri:\/\/localhost)(?::\d+)?/g, 'https://83s1c.online'],
];

export function rewrite(source) {
  return RULES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), source);
}

for (const file of process.argv.slice(2)) {
  const before = readFileSync(file, 'utf8');
  const after = rewrite(before);
  if (after !== before) writeFileSync(file, after);
}
