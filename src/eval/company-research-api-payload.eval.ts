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
