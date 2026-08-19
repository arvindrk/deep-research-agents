import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ResearchRun } from '@/lib/research/run';
import {
  EXPECTED_FIELDS,
  fieldCoverage,
  freshnessMix,
  partialShare,
  staleShare,
} from '@/lib/research/quality';
import type { ResearchFinding } from '@/lib/research/types';

const OBSERVED_AT = '2026-08-19T00:00:00.000Z';

const finding = (field: string, observedAt = OBSERVED_AT): ResearchFinding => ({
  source: 'website',
  field,
  value: `value for ${field}`,
  evidence_url: 'https://acme.test/',
  observed_at: observedAt,
  confidence: 'high',
});

const run = (
  id: string,
  findings: ResearchFinding[],
  status: ResearchRun['status'] = 'complete',
): ResearchRun => ({
  company_id: id,
  status,
  attempted: ['website'],
  succeeded: status === 'failed' ? [] : ['website'],
  failed: status === 'complete' ? [] : [{ source: 'website', error: 'timeout' }],
  findings,
  observed_at: findings[0]?.observed_at ?? OBSERVED_AT,
});

describe('fieldCoverage', () => {
  it('reports each expected field separately', () => {
    const coverage = fieldCoverage([
      run('a', [finding('website_title'), finding('website_description')]),
      run('b', [finding('website_title')]),
    ]);

    assert.equal(coverage.website_title, 1);
    assert.equal(coverage.website_description, 0.5);
  });

  it('counts a field once however many findings carry it', () => {
    const coverage = fieldCoverage([
      run('a', [finding('website_title'), finding('website_title')]),
    ]);
    assert.equal(coverage.website_title, 1);
  });

  it('reports zero rather than dividing by nothing', () => {
    const coverage = fieldCoverage([]);
    for (const field of EXPECTED_FIELDS) {
      assert.equal(coverage[field], 0);
    }
  });

  it('does not credit a run for a field it never found', () => {
    const coverage = fieldCoverage([run('a', [])]);
    assert.equal(coverage.website_title, 0);
  });
});

const NOW = new Date('2026-08-19T12:00:00.000Z');
const daysBefore = (days: number): string =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe('freshnessMix', () => {
  it('counts every finding into exactly one band', () => {
    const mix = freshnessMix(
      [
        run('a', [
          finding('website_title', daysBefore(1)),
          finding('website_description', daysBefore(20)),
        ]),
        run('b', [finding('website_title', daysBefore(200))]),
      ],
      NOW,
    );

    assert.deepEqual(mix, { fresh: 1, aging: 1, stale: 1, unknown: 0 });
    const total = Object.values(mix).reduce((sum, count) => sum + count, 0);
    assert.equal(total, 3);
  });

  it('bands an unreadable timestamp as unknown rather than dropping it', () => {
    const mix = freshnessMix([run('a', [finding('website_title', 'whenever')])], NOW);
    assert.equal(mix.unknown, 1);
  });

  it('reports all zeroes for no runs', () => {
    assert.deepEqual(freshnessMix([], NOW), {
      fresh: 0,
      aging: 0,
      stale: 0,
      unknown: 0,
    });
  });
});

describe('partialShare', () => {
  it('counts anything that is not complete', () => {
    const runs = [
      run('a', [finding('website_title')]),
      run('b', [finding('website_title')], 'partial'),
      run('c', [], 'failed'),
    ];
    assert.equal(partialShare(runs), 2 / 3);
  });

  it('is zero for no runs and for all-complete runs', () => {
    assert.equal(partialShare([]), 0);
    assert.equal(partialShare([run('a', [finding('website_title')])]), 0);
  });
});

describe('staleShare', () => {
  it('counts a profile whose every claim has gone stale', () => {
    const runs = [
      run('fresh', [finding('website_title', daysBefore(2))]),
      run('stale', [finding('website_title', daysBefore(120))]),
    ];
    assert.equal(staleShare(runs, NOW), 0.5);
  });

  it('does not call a profile stale while one claim is current', () => {
    const runs = [
      run('mixed', [
        finding('website_title', daysBefore(120)),
        finding('website_description', daysBefore(2)),
      ]),
    ];
    assert.equal(staleShare(runs, NOW), 0);
  });

  it('treats a run that found nothing as stale, not as fresh', () => {
    assert.equal(staleShare([run('empty', [], 'failed')], NOW), 1);
  });

  it('is zero for no runs', () => {
    assert.equal(staleShare([], NOW), 0);
  });
});
