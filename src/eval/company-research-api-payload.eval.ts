import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  REFRESH_UNKNOWN_COPY,
  buildCompanyResearchPayload,
} from '@/lib/research/api-payload';
import { EXPECTED_FIELDS } from '@/lib/research/quality';
import type { ResearchRunDisplayInput } from '@/lib/research/run-summary';
import type { ResearchFinding, ResearchSourceId } from '@/lib/research/types';

const REPO_ROOT = process.cwd();
const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');

const NOW = new Date('2026-09-12T00:00:00.000Z');
const OBSERVED_AT = '2026-09-10T00:00:00.000Z';

const finding = (source: ResearchSourceId, field: string): ResearchFinding => ({
  source,
  field,
  value: `${field} value`,
  evidence_url: 'https://acme.test/',
  observed_at: OBSERVED_AT,
  confidence: 'high',
});

const run = (
  status: ResearchRunDisplayInput['status'],
  findings: ResearchFinding[],
  failedSources: ResearchSourceId[] = [],
): ResearchRunDisplayInput => ({
  status,
  observed_at: OBSERVED_AT,
  findings,
  failedSources,
});

const payloadFor = (
  runs: ResearchRunDisplayInput[],
  historyLoaded = true,
): ReturnType<typeof buildCompanyResearchPayload> =>
  buildCompanyResearchPayload({
    companyId: 'c1',
    runsNewestFirst: runs,
    historyLoaded,
    now: NOW,
  });

describe('a complete run', () => {
  const payload = payloadFor([
    run('complete', [
      finding('website', 'website_title'),
      finding('website', 'website_description'),
      finding('careers', 'careers_title'),
      finding('careers', 'careers_description'),
    ]),
  ]);

  it('reports the status with its reader label', () => {
    assert.equal(payload.company_id, 'c1');
    assert.equal(payload.status, 'complete');
    assert.equal(payload.status_label, 'Complete');
    assert.equal(payload.observed_at, OBSERVED_AT);
  });

  it('carries no notice and no empty state', () => {
    assert.equal(payload.notice, null);
    assert.equal(payload.empty_state, null);
  });

  it('serialises every finding a reader would see, newest first', () => {
    assert.equal(payload.findings.length, 4);
    for (const item of payload.findings) {
      assert.equal(typeof item.label, 'string');
      assert.equal(typeof item.sourceLabel, 'string');
      assert.equal(typeof item.confidenceLabel, 'string');
      assert.equal(item.href, 'https://acme.test/');
      assert.equal(item.freshness, 'fresh');
    }
  });
});

describe('coverage and refresh timing travel with the payload', () => {
  it('summarises what a website-only run established', () => {
    const payload = payloadFor([
      run('partial', [finding('website', 'website_title')], ['careers']),
    ]);

    assert.deepEqual(payload.coverage.known, ['website_title']);
    assert.deepEqual(payload.coverage.missing, [
      'website_description',
      'careers_title',
      'careers_description',
    ]);
    assert.equal(payload.coverage.expected, EXPECTED_FIELDS.length);
    assert.equal(payload.coverage.summary, '1 of 4 expected fields are known.');
  });

  it('carries the refresh due date, countdown, and copy together', () => {
    const payload = payloadFor([run('complete', [finding('website', 'website_title')])]);

    assert.equal(payload.refresh.due_at, '2026-09-18T00:00:00.000Z');
    assert.equal(payload.refresh.days_until, 6);
    assert.equal(payload.refresh.summary, 'Refresh due in 6 days');
  });

  it('says timing is unknown when there is no run to time from', () => {
    const payload = payloadFor([]);

    assert.equal(payload.refresh.due_at, null);
    assert.equal(payload.refresh.days_until, null);
    assert.equal(payload.refresh.summary, REFRESH_UNKNOWN_COPY);
  });

  it('keeps the partial notice the page shows', () => {
    const payload = payloadFor([
      run('partial', [finding('website', 'website_title')], ['careers']),
    ]);

    assert.match(payload.notice ?? '', /partial/);
    assert.match(payload.notice ?? '', /careers/);
  });
});

describe('the honest empty states stay distinct', () => {
  it('says never researched when history loaded with no runs', () => {
    const payload = payloadFor([], true);
    assert.equal(payload.status, null);
    assert.equal(payload.status_label, null);
    assert.match(payload.empty_state ?? '', /No research has run/);
  });

  it('says the read failed when history did not load', () => {
    const payload = payloadFor([], false);
    assert.match(payload.empty_state ?? '', /Unable to load research history/);
    assert.notEqual(payload.empty_state, payloadFor([], true).empty_state);
  });

  it('says a run found nothing when it ran and produced no findings', () => {
    const payload = payloadFor([run('complete', [])]);
    assert.equal(payload.status_label, 'Complete');
    assert.match(payload.empty_state ?? '', /found nothing to report/);
  });

  it('surfaces earlier findings for a failed latest run, and says so', () => {
    const payload = payloadFor([
      run('failed', [], ['website', 'careers']),
      run('complete', [finding('website', 'website_title')]),
    ]);

    assert.equal(payload.status_label, 'Failed');
    assert.equal(payload.findings.length, 1);
    assert.match(payload.notice ?? '', /from an earlier run/);
    assert.equal(payload.empty_state, null);
  });
});

describe('what the payload must never carry', () => {
  it('holds no key outside the declared shape', () => {
    const payload = payloadFor([run('complete', [finding('website', 'website_title')])]);
    assert.deepEqual(Object.keys(payload).sort(), [
      'company_id',
      'coverage',
      'empty_state',
      'findings',
      'notice',
      'observed_at',
      'refresh',
      'status',
      'status_label',
    ]);
  });

  it('holds no embedding vector, driver text, or failure reason code', () => {
    const serialised = JSON.stringify(
      payloadFor([
        run('failed', [], ['website', 'careers']),
        run('partial', [finding('website', 'website_title')], ['careers']),
      ]),
    );

    assert.doesNotMatch(serialised, /embedding/);
    assert.doesNotMatch(serialised, /blocked_destination|http_status|oversize_body/);
    assert.doesNotMatch(serialised, /postgres(ql)?:\/\//);
  });

  it('reads no clock of its own', () => {
    const source = read('src/lib/research/api-payload.ts');
    assert.doesNotMatch(source, /Date\.now\(\)/);
    assert.doesNotMatch(source, /new Date\(\)/);
    assert.match(source, /now: Date/);
  });

  it('reimplements none of the helpers it assembles', () => {
    const source = read('src/lib/research/api-payload.ts');
    for (const imported of [
      'buildResearchSectionModel',
      'toEvidenceItems',
      'researchCoverage',
      'refreshDueCopy',
    ]) {
      assert.match(source, new RegExp(imported));
    }
    assert.doesNotMatch(source, /function (freshnessOf|relativeAge|runStatus)/);
  });
});
