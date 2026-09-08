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

/**
 * Message shapes the fetch guard throws. Matching on shape is unavoidable
 * (fetch and URL both throw plain Errors), so the patterns live next to the
 * closed set they map onto and are locked by an eval that provokes the real
 * errors rather than restating these strings.
 */
const REASON_RULES: readonly {
  pattern: RegExp;
  reason: ResearchFailureReason;
}[] = [
  { pattern: /research destination (blocked|must be|is not a valid)/i, reason: 'blocked_destination' },
  { pattern: /redirect/i, reason: 'redirect_failed' },
];
