import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { httpUrl } from '@/lib/safe-url';
import type { ResearchRun } from '@/lib/research/run';
import {
  EXPECTED_FIELDS,
  qualityReport,
  qualityViolations,
} from '@/lib/research/quality';

const FIXTURE = join(
  process.cwd(),
  'src/eval/fixtures/research-runs.json',
);

type Corpus = {
  recorded_as_of: string;
  runs: ResearchRun[];
};

/**
 * The corpus is a recording, so it is read and checked rather than trusted: a
 * fixture that has drifted into an impossible shape would otherwise measure
 * quality that enrichment never produced.
 */
const corpus = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Corpus;
const recordedAt = new Date(corpus.recorded_as_of);

describe('recorded research corpus', () => {
  it('is a usable recording', () => {
    assert.ok(Array.isArray(corpus.runs));
    assert.ok(corpus.runs.length >= 5, 'too small a corpus to measure anything');
    assert.ok(
      !Number.isNaN(recordedAt.getTime()),
      'recorded_as_of must be a readable timestamp',
    );
  });

  it('holds only runs the runtime could actually have produced', () => {
    for (const run of corpus.runs) {
      assert.ok(['complete', 'partial', 'failed'].includes(run.status), run.company_id);
      assert.ok(run.attempted.length > 0, `${run.company_id} attempted nothing`);

      if (run.status === 'complete') {
        assert.deepEqual(run.failed, [], `${run.company_id} is complete with failures`);
      } else {
        assert.ok(
          run.failed.length > 0,
          `${run.company_id} is ${run.status} with nothing recorded as failed`,
        );
      }

      for (const finding of run.findings) {
        assert.ok(finding.value.length > 0, `${run.company_id} has an empty value`);
        assert.equal(
          httpUrl(finding.evidence_url),
          finding.evidence_url,
          `${run.company_id} has evidence that is not an http URL`,
        );
        assert.ok(
          !Number.isNaN(new Date(finding.observed_at).getTime()),
          `${run.company_id} has an unreadable observed_at`,
        );
      }
    }
  });

  it('meets the research quality bar', () => {
    const report = qualityReport(corpus.runs, recordedAt);
    assert.deepEqual(
      qualityViolations(report),
      [],
      `research quality regressed: ${JSON.stringify(report)}`,
    );
  });

  it('measures every field the bar expects', () => {
    const report = qualityReport(corpus.runs, recordedAt);
    for (const field of EXPECTED_FIELDS) {
      assert.equal(
        typeof report.fieldCoverage[field],
        'number',
        `${field} is not measured`,
      );
    }
  });
});
