import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ResearchRun } from '@/lib/research/run';
import { EXPECTED_FIELDS, fieldCoverage } from '@/lib/research/quality';
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
