import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  collectorCoverage,
  coverageGaps,
} from '@/lib/research/collector-coverage';
import { qualityReport } from '@/lib/research/quality';
import { buildResearchRun, dedupeFindings } from '@/lib/research/run';
import { runResearch, type ResearchCollector } from '@/lib/research/runtime';
import {
  RESEARCH_SOURCES,
  type ResearchFinding,
  type ResearchSourceId,
  type SourceOutcome,
} from '@/lib/research/types';

const OBSERVED_AT = '2026-09-10T04:00:00.000Z';

const finding = (
  source: ResearchSourceId,
  field: string,
  value: string,
): ResearchFinding => ({
  source,
  field,
  value,
  evidence_url: 'https://acme.test/',
  observed_at: OBSERVED_AT,
  confidence: 'high',
});

describe('a claim is identified by its source and its field', () => {
  it('keeps the same field from two different sources', () => {
    const kept = dedupeFindings([
      finding('website', 'title', 'From the site'),
      finding('careers', 'title', 'From the careers page'),
    ]);
    assert.deepEqual(
      kept.map((f) => [f.source, f.value]),
      [
        ['website', 'From the site'],
        ['careers', 'From the careers page'],
      ],
    );
  });

  it('keeps different fields from the same source', () => {
    const kept = dedupeFindings([
      finding('website', 'website_title', 'Acme'),
      finding('website', 'website_description', 'We build things'),
    ]);
    assert.equal(kept.length, 2);
  });

  it('does not collapse claims that differ only in value', () => {
    const kept = dedupeFindings([
      finding('website', 'website_title', 'First'),
      finding('website', 'website_title', 'Second'),
    ]);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].value, 'First');
  });
});

describe('first wins, and order survives', () => {
  it('keeps the first of a repeated claim, whatever came after it', () => {
    const kept = dedupeFindings([
      finding('website', 'website_title', 'Acme'),
      finding('website', 'website_description', 'We build things'),
      finding('website', 'website_title', 'Acme Corporation'),
    ]);
    assert.deepEqual(
      kept.map((f) => [f.field, f.value]),
      [
        ['website_title', 'Acme'],
        ['website_description', 'We build things'],
      ],
    );
  });

  it('does not depend on how a caller ordered its collectors', () => {
    const website = finding('website', 'website_title', 'Acme');
    const careers = finding('careers', 'careers_title', 'Jobs at Acme');

    assert.deepEqual(
      dedupeFindings([website, careers, website]).map((f) => f.source),
      ['website', 'careers'],
    );
    assert.deepEqual(
      dedupeFindings([careers, website, careers]).map((f) => f.source),
      ['careers', 'website'],
    );
  });

  it('leaves a list with nothing repeated exactly as it was', () => {
    const findings = [
      finding('website', 'website_title', 'Acme'),
      finding('website', 'website_description', 'We build things'),
      finding('careers', 'careers_title', 'Jobs'),
    ];
    assert.deepEqual(dedupeFindings(findings), findings);
  });

  it('handles an empty list', () => {
    assert.deepEqual(dedupeFindings([]), []);
  });
});

describe('buildResearchRun folds duplicates before anything is written', () => {
  const ok = (source: ResearchSourceId, findings: ResearchFinding[]): SourceOutcome => ({
    status: 'ok',
    source,
    findings,
  });

  it('drops a claim two outcomes both reported', () => {
    const run = buildResearchRun(
      'c1',
      [
        ok('website', [finding('website', 'website_title', 'Acme')]),
        ok('website', [finding('website', 'website_title', 'Acme again')]),
      ],
      OBSERVED_AT,
    );

    assert.deepEqual(
      run.findings.map((f) => f.value),
      ['Acme'],
    );
  });

  it('leaves attempted, succeeded, and status alone', () => {
    const run = buildResearchRun(
      'c1',
      [
        ok('website', [finding('website', 'website_title', 'Acme')]),
        ok('website', [finding('website', 'website_title', 'Acme again')]),
      ],
      OBSERVED_AT,
    );

    assert.equal(run.status, 'complete');
    assert.deepEqual(run.attempted, ['website', 'website']);
    assert.deepEqual(run.succeeded, ['website', 'website']);
    assert.deepEqual(run.failed, []);
    assert.equal(run.company_id, 'c1');
    assert.equal(run.observed_at, OBSERVED_AT);
  });

  it('does not change a normal two-source run', () => {
    const run = buildResearchRun(
      'c1',
      [
        ok('website', [
          finding('website', 'website_title', 'Acme'),
          finding('website', 'website_description', 'We build things'),
        ]),
        ok('careers', [finding('careers', 'careers_title', 'Jobs at Acme')]),
      ],
      OBSERVED_AT,
    );

    assert.deepEqual(
      run.findings.map((f) => f.field),
      ['website_title', 'website_description', 'careers_title'],
    );
  });

  it('keeps a failed outcome contributing nothing, as before', () => {
    const run = buildResearchRun(
      'c1',
      [
        ok('website', [finding('website', 'website_title', 'Acme')]),
        { status: 'failed', source: 'careers', error: 'http_status' },
      ],
      OBSERVED_AT,
    );

    assert.equal(run.status, 'partial');
    assert.equal(run.findings.length, 1);
    assert.deepEqual(run.failed, [{ source: 'careers', error: 'http_status' }]);
  });
});

describe('the exposure this closes, end to end', () => {
  const SUBJECT = { id: 'c1', name: 'Acme', website: 'https://acme.test' };

  const collector = (source: ResearchSourceId, value: string): ResearchCollector => ({
    source,
    collect: async () => [finding(source, `${source}_title`, value)],
  });

  it('a collector list that claims one source twice yields one claim', async () => {
    const run = await runResearch(
      SUBJECT,
      [collector('website', 'Acme'), collector('website', 'Acme Corporation')],
      OBSERVED_AT,
    );

    assert.deepEqual(
      run.findings.map((f) => f.value),
      ['Acme'],
      'the duplicate would otherwise have been written and rendered twice',
    );
  });

  it('the shipped wiring is unaffected', async () => {
    const run = await runResearch(
      SUBJECT,
      [collector('website', 'Acme'), collector('careers', 'Jobs at Acme')],
      OBSERVED_AT,
    );

    assert.equal(run.status, 'complete');
    assert.deepEqual(
      run.findings.map((f) => f.field),
      ['website_title', 'careers_title'],
    );
  });

  it('still reports the duplicated source, so the cause stays visible', () => {
    const coverage = collectorCoverage(RESEARCH_SOURCES, [
      collector('website', 'Acme'),
      collector('website', 'Acme Corporation'),
    ]);

    assert.deepEqual(coverageGaps(coverage), [
      'declared source "careers" has no collector',
      'source "website" is claimed by more than one collector',
    ]);
  });
});

describe('what the quality measure would have counted twice', () => {
  const NOW = new Date('2026-09-10T12:00:00.000Z');

  const runWith = (findings: ResearchFinding[]) =>
    buildResearchRun('c1', [{ status: 'ok', source: 'website', findings }], OBSERVED_AT);

  it('counts a repeated claim once in the findings total', () => {
    const run = runWith([
      finding('website', 'website_title', 'Acme'),
      finding('website', 'website_title', 'Acme Corporation'),
      finding('website', 'website_description', 'We build things'),
    ]);

    assert.equal(qualityReport([run], NOW).findings, 2);
  });

  it('counts it once in the freshness mix', () => {
    const run = runWith([
      finding('website', 'website_title', 'Acme'),
      finding('website', 'website_title', 'Acme Corporation'),
    ]);

    const mix = qualityReport([run], NOW).freshness;
    assert.equal(mix.fresh + mix.aging + mix.stale + mix.unknown, 1);
  });

  it('leaves per-field coverage alone, which was already per run', () => {
    const run = runWith([
      finding('website', 'website_title', 'Acme'),
      finding('website', 'website_title', 'Acme Corporation'),
    ]);

    assert.equal(qualityReport([run], NOW).fieldCoverage.website_title, 1);
  });
});

describe('the recorded corpus', () => {
  const corpus = (
    JSON.parse(
      readFileSync(join(process.cwd(), 'src/eval/fixtures/research-runs.json'), 'utf8'),
    ) as { runs: { findings: { source: string; field: string }[] }[] }
  ).runs;

  it('is not empty, so this assertion means something', () => {
    assert.ok(corpus.length > 0);
  });

  it('holds no run with the same claim twice', () => {
    for (const [index, run] of corpus.entries()) {
      const keys = run.findings.map((f) => `${f.source}/${f.field}`);
      assert.deepEqual(
        keys,
        [...new Set(keys)],
        `recorded run ${index} has a duplicate claim; re-record it`,
      );
    }
  });
});
