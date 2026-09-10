import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  researchCoverage,
  researchCoverageCopy,
} from '@/lib/research/coverage';
import { EXPECTED_FIELDS } from '@/lib/research/quality';
import type { ResearchFinding, ResearchSourceId } from '@/lib/research/types';

const REPO_ROOT = process.cwd();
const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');
const OBSERVED_AT = '2026-09-10T18:00:00.000Z';

const finding = (source: ResearchSourceId, field: string): ResearchFinding => ({
  source,
  field,
  value: 'something',
  evidence_url: 'https://acme.test/',
  observed_at: OBSERVED_AT,
  confidence: 'high',
});

describe('coverage is measured against the expected fields', () => {
  it('takes its field list from the quality module, not a second copy', () => {
    assert.equal(researchCoverage([]).expected, EXPECTED_FIELDS.length);
    assert.deepEqual(researchCoverage([]).missing, [...EXPECTED_FIELDS]);
  });

  it('reports a complete two-source run as fully known', () => {
    const coverage = researchCoverage([
      finding('website', 'website_title'),
      finding('website', 'website_description'),
      finding('careers', 'careers_title'),
      finding('careers', 'careers_description'),
    ]);

    assert.deepEqual(coverage.known, [...EXPECTED_FIELDS]);
    assert.deepEqual(coverage.missing, []);
    assert.deepEqual(coverage.unexpected, []);
  });

  it('reports a website-only run as partly known, in expected order', () => {
    const coverage = researchCoverage([
      finding('website', 'website_description'),
      finding('website', 'website_title'),
    ]);

    assert.deepEqual(coverage.known, ['website_title', 'website_description']);
    assert.deepEqual(coverage.missing, ['careers_title', 'careers_description']);
  });

  it('reports nothing known for a run with no findings', () => {
    const coverage = researchCoverage([]);
    assert.deepEqual(coverage.known, []);
    assert.equal(coverage.missing.length, EXPECTED_FIELDS.length);
  });

  it('surfaces a field nothing expects instead of silently ignoring it', () => {
    const coverage = researchCoverage([
      finding('website', 'website_title'),
      finding('website', 'website_funding_round'),
    ]);

    assert.deepEqual(coverage.known, ['website_title']);
    assert.deepEqual(coverage.unexpected, ['website_funding_round']);
  });

  it('accepts an explicit field list without touching EXPECTED_FIELDS', () => {
    const coverage = researchCoverage([finding('website', 'a')], ['a', 'b']);
    assert.deepEqual(coverage, {
      known: ['a'],
      missing: ['b'],
      unexpected: [],
      expected: 2,
    });
    assert.equal(EXPECTED_FIELDS.length, 4);
  });
});

describe('the copy a reader sees', () => {
  const copyFor = (fields: string[]) =>
    researchCoverageCopy(researchCoverage(fields.map((f) => finding('website', f))));

  it('says nothing is known rather than showing a zero', () => {
    assert.equal(copyFor([]), 'Nothing known yet out of 4 expected fields.');
  });

  it('says all when nothing is missing', () => {
    assert.equal(copyFor([...EXPECTED_FIELDS]), 'All 4 expected fields are known.');
  });

  it('counts known against expected in between', () => {
    assert.equal(copyFor(['website_title']), '1 of 4 expected fields are known.');
    assert.equal(
      copyFor(['website_title', 'website_description', 'careers_title']),
      '3 of 4 expected fields are known.',
    );
  });

  it('does not count an unexpected field towards known', () => {
    assert.equal(
      copyFor(['website_title', 'website_funding_round']),
      '1 of 4 expected fields are known.',
    );
  });

  it('handles an empty expectation without dividing by zero or lying', () => {
    assert.equal(
      researchCoverageCopy(researchCoverage([], [])),
      'Nothing is expected for this company.',
    );
  });

  it('never contains a URL, a driver message, or a percentage', () => {
    for (const fields of [[], ['website_title'], [...EXPECTED_FIELDS]]) {
      const copy = copyFor(fields);
      assert.doesNotMatch(copy, /https?:\/\//);
      assert.doesNotMatch(copy, /%/);
    }
  });
});
