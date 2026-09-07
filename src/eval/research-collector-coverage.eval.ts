import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  collectorCoverage,
  coverageGaps,
} from '@/lib/research/collector-coverage';
import { DEFAULT_COLLECTORS } from '@/lib/research/runtime';
import { RESEARCH_SOURCES } from '@/lib/research/types';

describe('the shipped runtime wiring', () => {
  const coverage = collectorCoverage(RESEARCH_SOURCES, DEFAULT_COLLECTORS);

  it('gives every declared source exactly one collector', () => {
    assert.deepEqual(coverage.covered, [...RESEARCH_SOURCES]);
    assert.deepEqual(coverage.missing, []);
    assert.deepEqual(coverage.duplicated, []);
    assert.deepEqual(coverage.undeclared, []);
  });

  it('has no coverage gaps', () => {
    assert.deepEqual(coverageGaps(coverage), []);
  });

  it('declares as many collectors as sources', () => {
    assert.equal(DEFAULT_COLLECTORS.length, RESEARCH_SOURCES.length);
  });
});

describe('a declared source with no collector', () => {
  const coverage = collectorCoverage(
    ['website', 'careers', 'filings'],
    [{ source: 'website' }, { source: 'careers' }],
  );

  it('is reported as missing, not as covered', () => {
    assert.deepEqual(coverage.covered, ['website', 'careers']);
    assert.deepEqual(coverage.missing, ['filings']);
  });

  it('names the unreachable source in the gap report', () => {
    assert.deepEqual(coverageGaps(coverage), [
      'declared source "filings" has no collector',
    ]);
  });
});
