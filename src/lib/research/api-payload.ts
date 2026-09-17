import type { StoredResearchRun } from '@/db/queries/research';

import { researchCoverage, researchCoverageCopy } from './coverage';
import {
  daysUntilRefresh,
  refreshDueCopy,
  refreshDueDateTime,
} from './refresh-due';
import { toEvidenceItems, type EvidenceItem } from './evidence';
import type { ResearchRunStatus } from './run';
import {
  buildResearchSectionModel,
  researchEmptyStateCopy,
  researchRunStatusLabel,
  type ResearchRunDisplayInput,
  type ResearchRunStatusLabel,
} from './run-summary';

/**
 * One company's research, assembled once and read by both the page and the
 * API. Two assemblies of the same answer drift, and the drift is invisible
 * when each has its own tests.
 *
 * Serialisable on purpose: every field is a string, number, boolean, or an
 * array of those, so the route can return it without a mapping step that could
 * add or drop something the page shows.
 */
export type CompanyResearchPayload = {
  company_id: string;
  /** Null when no run has been loaded, which is not the same as a failed one. */
  status: ResearchRunStatus | null;
  status_label: ResearchRunStatusLabel | null;
  observed_at: string | null;
  /** Partial or failed honesty banner, null for a complete run. */
  notice: string | null;
  /** Closed copy for the no-findings case, null when there are findings. */
  empty_state: string | null;
  coverage: {
    known: string[];
    missing: string[];
    unexpected: string[];
    expected: number;
    summary: string;
  };
  refresh: {
    due_at: string | null;
    days_until: number | null;
    summary: string;
  };
  findings: EvidenceItem[];
};

/** Same closed string the section shows when there is no run to time from. */
export const REFRESH_UNKNOWN_COPY = 'Refresh timing unknown';

export type CompanyResearchInput = {
  companyId: string;
  /** Newest first, as getRecentResearchRuns returns them. */
  runsNewestFirst: readonly ResearchRunDisplayInput[];
  /** False when the history read failed; distinct from success with zero runs. */
  historyLoaded: boolean;
  now: Date;
};

/**
 * The one mapping from stored rows to display input, so the page and the route
 * cannot disagree about which fields of a run the answer is assembled from.
 */
export function toResearchRunDisplayInputs(
  runs: readonly StoredResearchRun[],
): ResearchRunDisplayInput[] {
  return runs.map((run) => ({
    status: run.status,
    observed_at: run.observed_at,
    findings: run.findings,
    failedSources: run.failed.map((failure) => failure.source),
  }));
}

export function buildCompanyResearchPayload(
  input: CompanyResearchInput,
): CompanyResearchPayload {
  const section = buildResearchSectionModel(input.runsNewestFirst);
  const findings = toEvidenceItems(section.findings, input.now);
  const coverage = researchCoverage(section.findings);
  const observedAt = section.latest?.observed_at ?? null;

  return {
    company_id: input.companyId,
    status: section.latest?.status ?? null,
    status_label: section.latest
      ? researchRunStatusLabel(section.latest.status)
      : null,
    observed_at: section.latest?.observed_at ?? null,
    notice: section.notice,
    empty_state:
      findings.length === 0
        ? researchEmptyStateCopy({
            historyLoaded: input.historyLoaded,
            hasLatestRun: section.latest != null,
          })
        : null,
    coverage: { ...coverage, summary: researchCoverageCopy(coverage) },
    refresh: {
      due_at: observedAt ? refreshDueDateTime(observedAt) : null,
      days_until: observedAt ? daysUntilRefresh(observedAt, input.now) : null,
      summary: observedAt
        ? refreshDueCopy(observedAt, input.now)
        : REFRESH_UNKNOWN_COPY,
    },
    findings,
  };
}
