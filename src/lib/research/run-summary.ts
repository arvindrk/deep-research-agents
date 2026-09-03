import type { ResearchRunStatus } from './run';
import type { ResearchSourceId } from './types';

/** Closed map: only ResearchRunStatus members become reader labels. */
const STATUS_LABEL: Record<ResearchRunStatus, 'Complete' | 'Partial' | 'Failed'> =
  {
    complete: 'Complete',
    partial: 'Partial',
    failed: 'Failed',
  };

export type ResearchRunStatusLabel = (typeof STATUS_LABEL)[ResearchRunStatus];

/** Reader-facing label for the latest research run status. */
export function researchRunStatusLabel(
  status: ResearchRunStatus,
): ResearchRunStatusLabel {
  return STATUS_LABEL[status];
}

/**
 * Banner copy for a non-complete latest run. Describes only that run: the
 * detail page loads getLatestResearchRun, so failed copy must never imply
 * findings from earlier runs.
 */
export function researchRunNoticeCopy(
  status: ResearchRunStatus,
  failedSources: readonly ResearchSourceId[],
): string | null {
  if (status === 'complete') return null;

  if (status === 'failed') {
    return 'The latest research run failed and collected no findings.';
  }

  const missing = failedSources.join(', ');
  return `This research run was partial: ${missing} did not report. What is shown is what this run collected.`;
}
