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
  {
    pattern: /research destination (blocked|must be|is not a valid)/i,
    reason: 'blocked_destination',
  },
  { pattern: /redirect/i, reason: 'redirect_failed' },
  { pattern: /non-HTML content type/i, reason: 'non_html' },
  { pattern: /body exceeds \d+ bytes/i, reason: 'oversize_body' },
  { pattern: /request failed with status \d+/i, reason: 'http_status' },
  { pattern: /(timed out|timeout|aborted)/i, reason: 'timeout' },
  {
    pattern: /(fetch failed|network|econnreset|enotfound|socket hang up)/i,
    reason: 'network',
  },
];

/**
 * Classify a thrown value. Anything unrecognised is `source_failed`: the run
 * still says the source failed, it just does not repeat a message nobody has
 * checked. A DOMException from AbortSignal.timeout is matched by name, because
 * its message differs between runtimes.
 */
export function researchFailureReason(error: unknown): ResearchFailureReason {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return 'timeout';
  }

  const message = error instanceof Error ? error.message : '';
  for (const rule of REASON_RULES) {
    if (rule.pattern.test(message)) return rule.reason;
  }
  return 'source_failed';
}

/**
 * The same closed set, read back. A stored or transported reason is text until
 * it is checked: a row written by an older deploy, a migration, or by hand can
 * hold anything, including the thrown message this set exists to keep out.
 * Anything unrecognised becomes source_failed, so the failure survives and the
 * unchecked text does not.
 */
export function asResearchFailureReason(value: unknown): ResearchFailureReason {
  return (
    RESEARCH_FAILURE_REASONS.find((reason) => reason === value) ?? 'source_failed'
  );
}
