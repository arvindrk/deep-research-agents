import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildResearchRunEvent,
  buildResearchScheduleEvent,
  RESEARCH_RUN_STATUSES,
  SCHEDULE_SKIP_REASONS,
} from '@/lib/observability/research-event';
import { latencyBucket } from '@/lib/observability/search-event';

const RUN_BASE = {
  companyId: 'co_fixture_1',
  attempted: ['website', 'careers'] as const,
  succeeded: ['website'] as const,
  failed: ['careers'] as const,
  findingsCount: 2,
  durationMs: 180,
};

const EXPECTED_RUN_KEYS = [
  'company_id',
  'duration_ms',
  'event',
  'findings_count',
  'latency_bucket',
  'sources_attempted',
  'sources_failed',
  'sources_succeeded',
  'status',
].sort();

describe('buildResearchRunEvent', () => {
  it('carries the same keys for every ResearchRunStatus', () => {
    const shapes = RESEARCH_RUN_STATUSES.map((status) =>
      Object.keys(buildResearchRunEvent({ ...RUN_BASE, status })).sort(),
    );
    for (const shape of shapes) {
      assert.deepEqual(shape, EXPECTED_RUN_KEYS, 'event shape drifts between statuses');
    }
  });

  it('records sources as ids only and reuses latencyBucket', () => {
    assert.deepEqual(
      buildResearchRunEvent({
        status: 'partial',
        companyId: 'co_fixture_1',
        attempted: ['website', 'careers'],
        succeeded: ['website'],
        failed: ['careers'],
        findingsCount: 2,
        durationMs: 180,
      }),
      {
        event: 'research.run',
        status: 'partial',
        company_id: 'co_fixture_1',
        sources_attempted: ['website', 'careers'],
        sources_succeeded: ['website'],
        sources_failed: ['careers'],
        findings_count: 2,
        duration_ms: 180,
        latency_bucket: latencyBucket(180),
      },
    );
  });

  it('never embeds finding values or error stacks on the wire', () => {
    const event = buildResearchRunEvent({
      status: 'failed',
      companyId: 'co_x',
      attempted: ['website'],
      succeeded: [],
      failed: ['website'],
      findingsCount: 0,
      durationMs: 12,
    });
    const serialized = JSON.stringify(event);
    assert.doesNotMatch(serialized, /"value"/);
    assert.doesNotMatch(serialized, /evidence_url/);
    assert.doesNotMatch(serialized, /Error:/);
    assert.doesNotMatch(serialized, /at /);
  });
});

describe('buildResearchScheduleEvent', () => {
  it('locks skip_counts keys to ScheduleSkipReason', () => {
    const event = buildResearchScheduleEvent({
      selectedCount: 3,
      skipCounts: { fresh: 4, over_cap: 2 },
    });
    assert.deepEqual(
      Object.keys(event.skip_counts).sort(),
      [...SCHEDULE_SKIP_REASONS].sort(),
    );
    assert.deepEqual(event, {
      event: 'research.schedule',
      selected_count: 3,
      skip_counts: { fresh: 4, over_cap: 2 },
    });
  });

  it('zeroes missing skip reasons rather than omitting keys', () => {
    const event = buildResearchScheduleEvent({
      selectedCount: 0,
      skipCounts: { fresh: 1, over_cap: 0 },
    });
    for (const reason of SCHEDULE_SKIP_REASONS) {
      assert.equal(typeof event.skip_counts[reason], 'number');
    }
  });
});

describe('research events as published', () => {
  const CREDENTIAL_SHAPES = [
    /postgres(ql)?:\/\//,
    /gh[pousr]_[A-Za-z0-9]{30,}/,
    /sk-[A-Za-z0-9_-]{20,}/,
    /AKIA[0-9A-Z]{16}/,
    /xox[baprs]-/,
  ];

  it('never serializes embeddings, connection strings, or credential shapes', () => {
    const run = buildResearchRunEvent({
      ...RUN_BASE,
      status: 'complete',
      succeeded: ['website', 'careers'],
      failed: [],
      findingsCount: 4,
    });
    const schedule = buildResearchScheduleEvent({
      selectedCount: 1,
      skipCounts: { fresh: 0, over_cap: 0 },
    });
    for (const serialized of [JSON.stringify(run), JSON.stringify(schedule)]) {
      assert.doesNotMatch(serialized, /embedding/);
      assert.doesNotMatch(serialized, /DATABASE_URL/);
      assert.doesNotMatch(serialized, /\[-?\d+\.\d+,/);
      for (const shape of CREDENTIAL_SHAPES) {
        assert.doesNotMatch(serialized, shape, shape.source);
      }
    }
  });
});
