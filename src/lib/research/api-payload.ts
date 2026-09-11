import type { EvidenceItem } from './evidence';
import type { ResearchRunStatus } from './run';
import type { ResearchRunStatusLabel } from './run-summary';

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
