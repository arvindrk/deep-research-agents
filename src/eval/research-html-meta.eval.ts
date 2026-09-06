import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { parseCareersFindings } from '@/lib/research/careers';
import {
  MAX_FINDING_VALUE_CHARS,
  RESEARCH_FETCH_TIMEOUT_MS,
  collapseValue,
  decodeHtmlEntities,
  headDescription,
  headTitle,
} from '@/lib/research/html-meta';
import { parseWebsiteFindings } from '@/lib/research/website';

const REPO_ROOT = process.cwd();
const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');

const OBSERVED_AT = '2026-09-06T12:00:00.000Z';
const SITE = 'https://acme.test/';
const CAREERS = 'https://acme.test/careers';

describe('shared collector bounds', () => {
  it('keeps the fetch timeout at 5s and the value cap at 300 characters', () => {
    assert.equal(RESEARCH_FETCH_TIMEOUT_MS, 5_000);
    assert.equal(MAX_FINDING_VALUE_CHARS, 300);
  });
});

describe('decodeHtmlEntities', () => {
  it('decodes the five entities the collectors handle', () => {
    assert.equal(
      decodeHtmlEntities('a&amp;b &lt;c&gt; &quot;d&quot; &#39;e&#39;'),
      `a&b <c> "d" 'e'`,
    );
  });

  it('decodes in one pass, so escaped markup stays escaped', () => {
    assert.equal(decodeHtmlEntities('&amp;lt;script&amp;gt;'), '&lt;script&gt;');
  });

  it('leaves entities it does not know alone', () => {
    assert.equal(decodeHtmlEntities('a &nbsp; b &copy;'), 'a &nbsp; b &copy;');
  });
});

describe('collapseValue', () => {
  it('collapses whitespace and trims', () => {
    assert.equal(collapseValue('  Acme \n\t  Corp  '), 'Acme Corp');
  });

  it('truncates at the shared cap', () => {
    const long = 'x'.repeat(MAX_FINDING_VALUE_CHARS + 50);
    assert.equal(collapseValue(long).length, MAX_FINDING_VALUE_CHARS);
  });
});
