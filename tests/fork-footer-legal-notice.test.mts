// 83s1c fork: AGPL Appropriate Legal Notices in the interactive UI footer.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  UPSTREAM_COPYRIGHT_YEARS,
  forkLegalNoticeHtml,
} from '../src/config/fork/footer.ts';
import { BRAND } from '../src/config/brand.ts';

const license = readFileSync(resolve(import.meta.dirname, '..', 'LICENSE'), 'utf8');
const licenseYears = license.match(/Copyright \(C\) (\d{4}-\d{4}) Elie Habib/)?.[1];

describe('fork AGPL Appropriate Legal Notices', () => {
  it('uses the copyright years from LICENSE', () => {
    assert.equal(licenseYears, '2024-2026');
    assert.equal(UPSTREAM_COPYRIGHT_YEARS, licenseYears);
  });

  it('renders the required notice with AGPL and Source links', () => {
    const html = forkLegalNoticeHtml(BRAND.sourceUrl);
    assert.match(html, new RegExp(`© ${UPSTREAM_COPYRIGHT_YEARS} Elie Habib and World Monitor contributors`));
    assert.match(html, /Modified by Cartooli/);
    assert.match(
      html,
      new RegExp(`<a href="${BRAND.upstreamUrl}"[^>]*>Based on ${BRAND.upstreamName}</a>`),
    );
    assert.match(
      html,
      new RegExp(`Licensed under <a href="${BRAND.licenseUrl}"[^>]*>AGPL-3\\.0</a>, with no warranty`),
    );
    assert.match(
      html,
      new RegExp(`<a href="${BRAND.sourceUrl}"[^>]*>Source</a>: ${BRAND.sourceUrl}`),
    );
    assert.doesNotMatch(html, /Someone™/);
  });

  it('keeps LICENSE intact and finds no project NOTICE file', () => {
    assert.match(license, /GNU AFFERO GENERAL PUBLIC LICENSE/);
    assert.match(license, /Copyright \(C\) 2024-2026 Elie Habib/);
    // No AGPL §7(b) NOTICE / extra attribution file in the repo root.
    assert.throws(() => readFileSync(resolve(import.meta.dirname, '..', 'NOTICE'), 'utf8'), /ENOENT/);
  });
});
