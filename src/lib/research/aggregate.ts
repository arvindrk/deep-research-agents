import type { EnrichmentStepResult, ResearchRunStatus } from './types';

/**
 * Derive the run status from step outcomes.
 *
 * Required steps that fail or are incomplete must never yield `complete`.
 * Mixed required success and failure is `partial`; every required step failing
 * is `failed`. Optional failures do not demote an otherwise complete run.
 */
export function aggregateRunStatus(
  steps: readonly EnrichmentStepResult[],
): ResearchRunStatus {
  const required = steps.filter((step) => step.required);
  if (required.length === 0) {
    return 'complete';
  }

  const succeeded = required.filter((step) => step.ok).length;
  const failed = required.length - succeeded;

  if (failed === 0) {
    return 'complete';
  }
  if (succeeded === 0) {
    return 'failed';
  }
  return 'partial';
}

/** Merge successful step payloads into one output object keyed by step id. */
export function mergeStepOutput(
  steps: readonly EnrichmentStepResult[],
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const step of steps) {
    if (step.ok) {
      output[step.stepId] = step.data;
    }
  }
  return output;
}
