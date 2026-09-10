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
