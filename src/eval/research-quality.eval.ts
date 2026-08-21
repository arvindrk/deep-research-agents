import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ResearchRun } from '@/lib/research/run';
import {
  EXPECTED_FIELDS,
  fieldCoverage,
  freshnessMix,
  partialShare,
  QUALITY_BAR,
  qualityReport,
  qualityViolations,
  staleShare,
} from '@/lib/research/quality';
import type { ResearchFinding } from '@/lib/research/types';

const OBSERVED_AT = '2026-08-19T00:00:00.000Z';

const finding = (field: string, observedAt = OBSERVED_AT): ResearchFinding => {
  const careers = field.startsWith('careers_');
  return {
    source: careers ? 'careers' : 'website',
    field,
    value: `value for ${field}`,
    evidence_url: careers ? 'https://acme.test/careers' : 'https://acme.test/',
    observed_at: observedAt,
    confidence: 'high',
  };
};

const allExpectedFindings = (): ResearchFinding[] =>
  EXPECTED_FIELDS.map((field) => finding(field));

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

describe('qualityReport', () => {
  it('counts runs and findings alongside the measures', () => {
    const report = qualityReport(
      [
        run('a', [finding('website_title'), finding('website_description')]),
        run('b', [finding('website_title')], 'partial'),
      ],
      NOW,
    );

    assert.equal(report.runs, 2);
    assert.equal(report.findings, 3);
    assert.equal(report.fieldCoverage.website_title, 1);
    assert.equal(report.partialShare, 0.5);
  });
});

describe('qualityViolations', () => {
  const healthy = [
    run('a', allExpectedFindings()),
    run('b', allExpectedFindings()),
    run('c', allExpectedFindings()),
  ];

  it('reports nothing for a corpus that clears the bar', () => {
    assert.deepEqual(qualityViolations(qualityReport(healthy, NOW)), []);
  });

  it('names the field whose coverage fell', () => {
    const degraded = [
      run('a', [
        finding('website_title'),
        finding('careers_title'),
        finding('careers_description'),
      ]),
      run('b', [
        finding('website_title'),
        finding('careers_title'),
        finding('careers_description'),
      ]),
      run('c', [
        finding('website_title'),
        finding('careers_title'),
        finding('careers_description'),
      ]),
    ];
    const violations = qualityViolations(qualityReport(degraded, NOW));
    assert.equal(violations.length, 1);
    assert.match(violations[0], /website_description coverage 0\.00 is below/);
  });

  it('reports staleness and partial runs separately', () => {
    const stale = healthy.map((entry) => ({
      ...entry,
      findings: entry.findings.map((f) => ({
        ...f,
        observed_at: daysBefore(200),
      })),
      status: 'partial' as const,
    }));

    const violations = qualityViolations(qualityReport(stale, NOW));
    assert.ok(violations.some((line) => line.startsWith('stale share')));
    assert.ok(violations.some((line) => line.startsWith('partial share')));
  });

  it('says so rather than passing vacuously on an empty corpus', () => {
    assert.deepEqual(qualityViolations(qualityReport([], NOW)), [
      'no research runs to measure',
    ]);
  });

  it('holds the bar itself to the values users are promised', () => {
    assert.deepEqual(QUALITY_BAR, {
      minFieldCoverage: 0.6,
      maxStaleShare: 0.25,
      maxPartialShare: 0.34,
    });
  });

  it('expects website and careers fields from each shipped collector', () => {
    assert.deepEqual(EXPECTED_FIELDS, [
      'website_title',
      'website_description',
      'careers_title',
      'careers_description',
    ]);
  });
});
