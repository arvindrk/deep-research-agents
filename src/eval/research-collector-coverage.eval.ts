import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  collectorCoverage,
  coverageGaps,
} from '@/lib/research/collector-coverage';
import {
  DEFAULT_COLLECTORS,
  runResearch,
  type ResearchCollector,
} from '@/lib/research/runtime';
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

describe('a source claimed twice', () => {
  const coverage = collectorCoverage(
    ['website', 'careers'],
    [{ source: 'website' }, { source: 'website' }],
  );

  it('is not counted as covered, and the other source is still missing', () => {
    assert.deepEqual(coverage.covered, []);
    assert.deepEqual(coverage.duplicated, ['website']);
    assert.deepEqual(coverage.missing, ['careers']);
  });

  it('reports both gaps, because matching array lengths hid them', () => {
    assert.deepEqual(coverageGaps(coverage), [
      'declared source "careers" has no collector',
      'source "website" is claimed by more than one collector',
    ]);
  });
});

describe('a collector for a source nobody declared', () => {
  const coverage = collectorCoverage(
    ['website'],
    [{ source: 'website' }, { source: 'crunchbase' }],
  );

  it('is reported as undeclared rather than ignored', () => {
    assert.deepEqual(coverage.covered, ['website']);
    assert.deepEqual(coverage.undeclared, ['crunchbase']);
    assert.deepEqual(coverage.missing, []);
    assert.deepEqual(coverage.duplicated, []);
  });

  it('names it in the gap report', () => {
    assert.deepEqual(coverageGaps(coverage), [
      'collector source "crunchbase" is not declared in RESEARCH_SOURCES',
    ]);
  });
});

describe('coverageGaps', () => {
  it('is empty only when the wiring is exact', () => {
    for (const [sources, collectors] of [
      [[], []],
      [['website'], [{ source: 'website' }]],
      [
        ['website', 'careers'],
        [{ source: 'careers' }, { source: 'website' }],
      ],
    ] as const) {
      assert.deepEqual(coverageGaps(collectorCoverage(sources, collectors)), []);
    }
  });

  it('reports every kind of gap at once', () => {
    const gaps = coverageGaps(
      collectorCoverage(
        ['website', 'careers', 'filings'],
        [{ source: 'website' }, { source: 'website' }, { source: 'wire' }],
      ),
    );

    assert.deepEqual(gaps, [
      'declared source "careers" has no collector',
      'declared source "filings" has no collector',
      'source "website" is claimed by more than one collector',
      'collector source "wire" is not declared in RESEARCH_SOURCES',
    ]);
  });

  it('does not care what order the collectors are declared in', () => {
    const forward = collectorCoverage(
      ['website', 'careers'],
      [{ source: 'website' }, { source: 'careers' }],
    );
    const reversed = collectorCoverage(
      ['website', 'careers'],
      [{ source: 'careers' }, { source: 'website' }],
    );
    assert.deepEqual(forward, reversed);
  });
});

describe('why this invariant needs an eval', () => {
  const SUBJECT = { id: 'c1', name: 'Acme', website: 'https://acme.test' };
  const OBSERVED_AT = '2026-09-07T12:00:00.000Z';

  const stub = (source: string): ResearchCollector =>
    ({
      source,
      collect: async () => [
        {
          source,
          field: `${source}_title`,
          value: 'Acme',
          evidence_url: 'https://acme.test/',
          observed_at: OBSERVED_AT,
          confidence: 'high',
        },
      ],
    }) as ResearchCollector;

  it('records a run with a dropped collector as complete, not partial', async () => {
    const run = await runResearch(SUBJECT, [stub('website')], OBSERVED_AT);

    assert.equal(run.status, 'complete');
    assert.deepEqual(run.attempted, ['website']);
    assert.deepEqual(run.failed, []);
  });

  it('leaves no trace of the source that was never asked', async () => {
    const run = await runResearch(SUBJECT, [stub('website')], OBSERVED_AT);

    assert.equal(run.attempted.includes('careers'), false);
    assert.equal(
      run.findings.some((finding) => finding.source === 'careers'),
      false,
    );
    assert.deepEqual(
      coverageGaps(collectorCoverage(RESEARCH_SOURCES, [stub('website')])),
      ['declared source "careers" has no collector'],
      'only the coverage check can see this; the run record cannot',
    );
  });
});
