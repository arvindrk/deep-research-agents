import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ResearchRunStatus } from '@/lib/research/run';
import {
  researchRunNoticeCopy,
  researchRunStatusLabel,
} from '@/lib/research/run-summary';
import type { ResearchSourceId } from '@/lib/research/types';

const STATUSES: readonly ResearchRunStatus[] = [
  'complete',
  'partial',
  'failed',
];

const EXPECTED_LABEL: Record<ResearchRunStatus, string> = {
  complete: 'Complete',
  partial: 'Partial',
  failed: 'Failed',
};

describe('researchRunStatusLabel', () => {
  it('maps every ResearchRunStatus to a closed Complete/Partial/Failed label', () => {
    for (const status of STATUSES) {
      assert.equal(researchRunStatusLabel(status), EXPECTED_LABEL[status]);
    }
  });

  it('exposes only the three closed reader labels', () => {
    const labels = new Set(STATUSES.map(researchRunStatusLabel));
    assert.deepEqual([...labels].sort(), ['Complete', 'Failed', 'Partial']);
  });
});

describe('researchRunNoticeCopy', () => {
  it('returns no notice when the latest run is complete', () => {
    assert.equal(researchRunNoticeCopy('complete', []), null);
    assert.equal(researchRunNoticeCopy('complete', ['website']), null);
  });

  it('describes a failed latest run without implying earlier-run findings', () => {
    for (const failed of [
      [] as ResearchSourceId[],
      ['website'] as ResearchSourceId[],
      ['website', 'careers'] as ResearchSourceId[],
    ]) {
      const notice = researchRunNoticeCopy('failed', failed);
      assert.ok(notice, `expected notice for failed with ${failed.join(',')}`);
      assert.equal(
        /earlier/i.test(notice),
        false,
        `failed notice must not mention earlier runs: ${notice}`,
      );
      assert.match(notice, /latest research run failed/i);
      assert.match(notice, /no findings/i);
    }
  });

  it('names missing sources on a partial latest run and scopes copy to this run', () => {
    const notice = researchRunNoticeCopy('partial', ['careers']);
    assert.ok(notice);
    assert.match(notice, /partial/i);
    assert.match(notice, /careers/);
    assert.match(notice, /this run collected/i);
    assert.equal(/earlier/i.test(notice), false);
  });
});
