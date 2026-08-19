import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  aggregateRunStatus,
  mergeStepOutput,
  researchContextFromCompany,
  runCompanyResearch,
  type EnrichmentStep,
  type EnrichmentStepResult,
  type ResearchContext,
} from '@/lib/research';

const baseCtx: ResearchContext = {
  companyId: 'company-1',
  name: 'Acme',
  oneLiner: 'Rockets',
  longDescription: null,
  website: 'https://acme.test',
  tags: ['AI', 'Fintech'],
  industries: ['Software'],
  regions: ['americas'],
};

function okStep(
  stepId: string,
  required: boolean,
  data: Record<string, unknown> = {},
): EnrichmentStepResult {
  return { stepId, required, ok: true, data };
}

function failStep(
  stepId: string,
  required: boolean,
  error = 'step failed',
): EnrichmentStepResult {
  return { stepId, required, ok: false, error };
}

describe('aggregateRunStatus', () => {
  it('is complete when every required step succeeded', () => {
    assert.equal(
      aggregateRunStatus([
        okStep('a', true),
        okStep('b', true),
        failStep('optional', false),
      ]),
      'complete',
    );
  });

  it('is partial when some required steps succeed and some fail', () => {
    assert.equal(
      aggregateRunStatus([okStep('a', true), failStep('b', true)]),
      'partial',
    );
  });

  it('is failed when every required step failed', () => {
    assert.equal(
      aggregateRunStatus([failStep('a', true), failStep('b', true)]),
      'failed',
    );
  });

  it('never marks a required failure as complete', () => {
    const fixtures: EnrichmentStepResult[][] = [
      [failStep('only', true)],
      [okStep('a', true), failStep('b', true)],
      [failStep('a', true), okStep('b', true), failStep('c', true)],
      [okStep('optional-only', false), failStep('required', true)],
    ];

    for (const steps of fixtures) {
      assert.notEqual(aggregateRunStatus(steps), 'complete', JSON.stringify(steps));
    }
  });

  it('is complete when there are no required steps', () => {
    assert.equal(aggregateRunStatus([okStep('opt', false)]), 'complete');
    assert.equal(aggregateRunStatus([]), 'complete');
  });
});

describe('mergeStepOutput', () => {
  it('keeps only successful step payloads keyed by step id', () => {
    assert.deepEqual(
      mergeStepOutput([
        okStep('snapshot', true, { name: 'Acme' }),
        failStep('taxonomy', true),
        okStep('extra', false, { note: 'ok' }),
      ]),
      {
        snapshot: { name: 'Acme' },
        extra: { note: 'ok' },
      },
    );
  });
});

describe('runCompanyResearch', () => {
  it('aggregates injectable steps into complete', async () => {
    const steps: EnrichmentStep[] = [
      {
        id: 'snapshot',
        required: true,
        enrich: async (ctx) => ({ ok: true, data: { name: ctx.name } }),
      },
      {
        id: 'taxonomy',
        required: true,
        enrich: async () => ({ ok: true, data: { tags: ['ai'] } }),
      },
    ];

    const run = await runCompanyResearch(baseCtx, steps);
    assert.equal(run.status, 'complete');
    assert.equal(run.companyId, 'company-1');
    assert.deepEqual(run.output.snapshot, { name: 'Acme' });
  });

  it('records partial when one required injectable step fails', async () => {
    const steps: EnrichmentStep[] = [
      {
        id: 'snapshot',
        required: true,
        enrich: async (ctx) => ({ ok: true, data: { name: ctx.name } }),
      },
      {
        id: 'taxonomy',
        required: true,
        enrich: async () => ({ ok: false, error: 'source unavailable' }),
      },
    ];

    const run = await runCompanyResearch(baseCtx, steps);
    assert.equal(run.status, 'partial');
    assert.notEqual(run.status, 'complete');
    assert.equal(run.steps[1]?.ok, false);
  });

  it('records failed when every required step fails', async () => {
    const steps: EnrichmentStep[] = [
      {
        id: 'a',
        required: true,
        enrich: async () => ({ ok: false, error: 'down' }),
      },
      {
        id: 'b',
        required: true,
        enrich: async () => {
          throw new Error('boom');
        },
      },
    ];

    const run = await runCompanyResearch(baseCtx, steps);
    assert.equal(run.status, 'failed');
    assert.equal(run.steps.length, 2);
    assert.equal(run.steps.every((step) => !step.ok), true);
  });

  it('continues after a failure so later successes are kept', async () => {
    const order: string[] = [];
    const steps: EnrichmentStep[] = [
      {
        id: 'first',
        required: true,
        enrich: async () => {
          order.push('first');
          return { ok: false, error: 'first failed' };
        },
      },
      {
        id: 'second',
        required: true,
        enrich: async () => {
          order.push('second');
          return { ok: true, data: { kept: true } };
        },
      },
    ];

    const run = await runCompanyResearch(baseCtx, steps);
    assert.deepEqual(order, ['first', 'second']);
    assert.equal(run.status, 'partial');
    assert.deepEqual(run.output.second, { kept: true });
  });
});

describe('researchContextFromCompany', () => {
  it('maps stored company fields into the enrichment context', () => {
    const ctx = researchContextFromCompany({
      id: 'c1',
      name: 'Acme',
      one_liner: 'Rockets',
      long_description: null,
      website: null,
      tags: ['ai'],
      industries: [],
      regions: ['americas'],
    });
    assert.equal(ctx.companyId, 'c1');
    assert.equal(ctx.oneLiner, 'Rockets');
    assert.deepEqual(ctx.tags, ['ai']);
  });
});
