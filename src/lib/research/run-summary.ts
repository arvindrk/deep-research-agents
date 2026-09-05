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
