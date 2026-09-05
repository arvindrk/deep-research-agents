import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ResearchFinding } from '@/lib/research/types';
import {
  buildResearchSectionModel,
  researchRunNoticeCopy,
  researchRunStatusLabel,
  selectDisplayedResearchFindings,
  type ResearchRunDisplayInput,
} from '@/lib/research/run-summary';

const finding = (
  field: string,
  value: string,
  observed_at: string,
): ResearchFinding => ({
  source: 'website',
  field,
  value,
  evidence_url: 'https://example.com',
  observed_at,
  confidence: 'high',
});

const run = (
  partial: Partial<ResearchRunDisplayInput> &
    Pick<ResearchRunDisplayInput, 'status' | 'observed_at'>,
): ResearchRunDisplayInput => ({
  findings: [],
  failedSources: [],
  ...partial,
});

describe('selectDisplayedResearchFindings', () => {
  it('uses prior findings verbatim when latest is failed and a prior run has findings', () => {
    const priorFindings = [
      finding('one_liner', 'Earlier claim', '2026-01-01T00:00:00.000Z'),
    ];
    const selected = selectDisplayedResearchFindings([
      run({
        status: 'failed',
        observed_at: '2026-02-01T00:00:00.000Z',
        findings: [],
        failedSources: ['website', 'careers'],
      }),
      run({
        status: 'complete',
        observed_at: '2026-01-01T00:00:00.000Z',
        findings: priorFindings,
      }),
    ]);

    assert.equal(selected.fromEarlierRun, true);
    assert.deepEqual(selected.findings, priorFindings);
  });

  it('keeps an empty findings list when latest failed and no prior run has findings', () => {
    const selected = selectDisplayedResearchFindings([
      run({
        status: 'failed',
        observed_at: '2026-02-01T00:00:00.000Z',
        findings: [],
      }),
      run({
        status: 'failed',
        observed_at: '2026-01-01T00:00:00.000Z',
        findings: [],
      }),
    ]);

    assert.equal(selected.fromEarlierRun, false);
    assert.deepEqual(selected.findings, []);
  });

  it('shows only the latest findings for complete and partial runs', () => {
    const latestFindings = [
      finding('one_liner', 'Latest claim', '2026-02-01T00:00:00.000Z'),
    ];
    const priorFindings = [
      finding('one_liner', 'Earlier claim', '2026-01-01T00:00:00.000Z'),
    ];

    for (const status of ['complete', 'partial'] as const) {
      const selected = selectDisplayedResearchFindings([
        run({
          status,
          observed_at: '2026-02-01T00:00:00.000Z',
          findings: latestFindings,
          failedSources: status === 'partial' ? ['careers'] : [],
        }),
        run({
          status: 'complete',
          observed_at: '2026-01-01T00:00:00.000Z',
          findings: priorFindings,
        }),
      ]);

      assert.equal(selected.fromEarlierRun, false, status);
      assert.deepEqual(selected.findings, latestFindings, status);
    }
  });
});

describe('buildResearchSectionModel', () => {
  it('keeps Failed badge and observed_at on the latest run while showing earlier findings', () => {
    const priorFindings = [
      finding('headcount', '40', '2026-01-01T00:00:00.000Z'),
    ];
    const model = buildResearchSectionModel([
      run({
        status: 'failed',
        observed_at: '2026-03-01T12:00:00.000Z',
        findings: [],
        failedSources: ['website'],
      }),
      run({
        status: 'complete',
        observed_at: '2026-01-01T00:00:00.000Z',
        findings: priorFindings,
      }),
    ]);

    assert.ok(model.latest);
    assert.equal(model.latest.status, 'failed');
    assert.equal(model.latest.observed_at, '2026-03-01T12:00:00.000Z');
    assert.equal(researchRunStatusLabel(model.latest.status), 'Failed');
    assert.deepEqual(model.findings, priorFindings);
    assert.ok(model.notice);
    assert.match(model.notice, /earlier run/i);
    assert.equal(/collected no findings/i.test(model.notice), false);
  });

  it('uses failed-without-history notice when latest failed and no prior findings exist', () => {
    const model = buildResearchSectionModel([
      run({
        status: 'failed',
        observed_at: '2026-03-01T12:00:00.000Z',
        findings: [],
      }),
    ]);

    assert.deepEqual(model.findings, []);
    assert.equal(
      model.notice,
      researchRunNoticeCopy('failed', [], false),
    );
    assert.match(model.notice ?? '', /no findings/i);
    assert.equal(/earlier/i.test(model.notice ?? ''), false);
  });

  it('keeps partial notice scoped to the latest run and its findings', () => {
    const latestFindings = [
      finding('one_liner', 'Partial claim', '2026-02-01T00:00:00.000Z'),
    ];
    const model = buildResearchSectionModel([
      run({
        status: 'partial',
        observed_at: '2026-02-01T00:00:00.000Z',
        findings: latestFindings,
        failedSources: ['careers'],
      }),
      run({
        status: 'complete',
        observed_at: '2026-01-01T00:00:00.000Z',
        findings: [finding('one_liner', 'Old', '2026-01-01T00:00:00.000Z')],
      }),
    ]);

    assert.deepEqual(model.findings, latestFindings);
    assert.ok(model.notice);
    assert.match(model.notice, /partial/i);
    assert.match(model.notice, /careers/);
    assert.equal(/earlier/i.test(model.notice), false);
  });

  it('returns a null notice for a complete latest run', () => {
    const model = buildResearchSectionModel([
      run({
        status: 'complete',
        observed_at: '2026-02-01T00:00:00.000Z',
        findings: [finding('one_liner', 'Done', '2026-02-01T00:00:00.000Z')],
      }),
    ]);

    assert.equal(model.notice, null);
  });
});

describe('researchRunNoticeCopy with earlier findings', () => {
  it('states findings come from an earlier run when hasEarlierFindings is true', () => {
    const notice = researchRunNoticeCopy('failed', ['website'], true);
    assert.ok(notice);
    assert.match(notice, /latest research run failed/i);
    assert.match(notice, /earlier run/i);
    assert.equal(/collected no findings/i.test(notice), false);
  });
});
