/**
 * Why a source failed, as a closed set. A run's failure reason is persisted and
 * read back, so it cannot be free text: a thrown message carries the URL it was
 * fetching, query string and all, and that is not something to write to a
 * database and render on a company page.
 */
export const RESEARCH_FAILURE_REASONS = [
  'blocked_destination',
  'redirect_failed',
  'non_html',
  'oversize_body',
  'http_status',
  'timeout',
  'network',
  'source_failed',
] as const;

export type ResearchFailureReason = (typeof RESEARCH_FAILURE_REASONS)[number];
