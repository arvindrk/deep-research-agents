import type { ResearchRunStatus } from './run';
import type { ResearchFinding, ResearchSourceId } from './types';

/** Closed map: only ResearchRunStatus members become reader labels. */
const STATUS_LABEL: Record<ResearchRunStatus, 'Complete' | 'Partial' | 'Failed'> =
  {
    complete: 'Complete',
    partial: 'Partial',
    failed: 'Failed',
  };

export type ResearchRunStatusLabel = (typeof STATUS_LABEL)[ResearchRunStatus];

/** Minimal run shape for display selection. Newest-first when passed as a list. */
export type ResearchRunDisplayInput = {
  status: ResearchRunStatus;
  observed_at: string;
  findings: readonly ResearchFinding[];
  failedSources: readonly ResearchSourceId[];
};

export type ResearchSectionModel = {
  latest: { status: ResearchRunStatus; observed_at: string } | null;
  findings: ResearchFinding[];
  notice: string | null;
};

/** Closed reader copy when research history loaded successfully with zero runs. */
export const RESEARCH_EMPTY_HISTORY_COPY =
  'No research has run for this company yet.';

/** Closed reader copy when the research history read failed. Never include driver text. */
export const RESEARCH_LOAD_FAILURE_COPY =
  'Unable to load research history for this company. Please try again later.';

/** Closed reader copy when a run exists but produced no findings to show. */
export const RESEARCH_EMPTY_FINDINGS_COPY =
  'The last research run found nothing to report for this company.';

/**
 * Empty-state copy for the Research section. Load failure must never reuse the
 * never-researched sentence.
 */
export function researchEmptyStateCopy(input: {
  historyLoaded: boolean;
  hasLatestRun: boolean;
}): string {
  if (!input.historyLoaded) return RESEARCH_LOAD_FAILURE_COPY;
  if (!input.hasLatestRun) return RESEARCH_EMPTY_HISTORY_COPY;
  return RESEARCH_EMPTY_FINDINGS_COPY;
}

/** Reader-facing label for the latest research run status. */
export function researchRunStatusLabel(
  status: ResearchRunStatus,
): ResearchRunStatusLabel {
  return STATUS_LABEL[status];
}

/**
 * Pick which findings to show. Complete and partial keep the latest run only.
 * Failed may surface an earlier run's findings verbatim when that run has any;
 * never merge fields across runs.
 */
export function selectDisplayedResearchFindings(
  runsNewestFirst: readonly Pick<
    ResearchRunDisplayInput,
    'status' | 'findings'
  >[],
): { findings: ResearchFinding[]; fromEarlierRun: boolean } {
  if (runsNewestFirst.length === 0) {
    return { findings: [], fromEarlierRun: false };
  }

  const latest = runsNewestFirst[0];
  if (latest.status === 'failed') {
    for (let i = 1; i < runsNewestFirst.length; i++) {
      const prior = runsNewestFirst[i];
      if (prior.findings.length > 0) {
        return { findings: [...prior.findings], fromEarlierRun: true };
      }
    }
  }

  return { findings: [...latest.findings], fromEarlierRun: false };
}

/**
 * Banner copy for a non-complete latest run. Failed with earlier findings must
 * say those findings are from an earlier run; failed without them must not.
 */
export function researchRunNoticeCopy(
  status: ResearchRunStatus,
  failedSources: readonly ResearchSourceId[],
  hasEarlierFindings = false,
): string | null {
  if (status === 'complete') return null;

  if (status === 'failed') {
    if (hasEarlierFindings) {
      return 'The latest research run failed. Findings below are from an earlier run.';
    }
    return 'The latest research run failed and collected no findings.';
  }

  const missing = failedSources.join(', ');
  return `This research run was partial: ${missing} did not report. What is shown is what this run collected.`;
}

/** Status, notice, and findings for the Research section from newest-first runs. */
export function buildResearchSectionModel(
  runsNewestFirst: readonly ResearchRunDisplayInput[],
): ResearchSectionModel {
  if (runsNewestFirst.length === 0) {
    return { latest: null, findings: [], notice: null };
  }

  const latest = runsNewestFirst[0];
  const { findings, fromEarlierRun } =
    selectDisplayedResearchFindings(runsNewestFirst);

  return {
    latest: { status: latest.status, observed_at: latest.observed_at },
    findings,
    notice: researchRunNoticeCopy(
      latest.status,
      latest.failedSources,
      fromEarlierRun,
    ),
  };
}
