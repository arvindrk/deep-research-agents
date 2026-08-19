import { aggregateRunStatus, mergeStepOutput } from './aggregate';
import type {
  EnrichmentStep,
  EnrichmentStepResult,
  ResearchContext,
  ResearchRun,
} from './types';

/**
 * Run every enrichment step for one company. Steps keep going after a failure
 * so a partial result can still be recorded. Status comes only from
 * `aggregateRunStatus`, never from assuming success.
 */
export async function runCompanyResearch(
  ctx: ResearchContext,
  steps: readonly EnrichmentStep[],
): Promise<ResearchRun> {
  const results: EnrichmentStepResult[] = [];

  for (const step of steps) {
    try {
      const outcome = await step.enrich(ctx);
      if (outcome.ok) {
        results.push({
          stepId: step.id,
          required: step.required,
          ok: true,
          data: outcome.data,
        });
      } else {
        results.push({
          stepId: step.id,
          required: step.required,
          ok: false,
          error: outcome.error,
        });
      }
    } catch (error) {
      results.push({
        stepId: step.id,
        required: step.required,
        ok: false,
        error: error instanceof Error ? error.message : 'Enrichment step failed',
      });
    }
  }

  return {
    companyId: ctx.companyId,
    status: aggregateRunStatus(results),
    steps: results,
    output: mergeStepOutput(results),
  };
}
