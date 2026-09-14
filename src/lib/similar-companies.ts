/**
 * What a "companies like this one" request may ask for. The limit is bounded
 * here rather than in the query, so a route, a page, and a background job all
 * get the same answer to the same bad input.
 */
export const SIMILAR_COMPANIES_DEFAULT_LIMIT = 6;
export const SIMILAR_COMPANIES_MAX_LIMIT = 24;

/** A number, or a number written down. Everything else is not a limit. */
function asNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return Number.NaN;

  const trimmed = raw.trim();
  return trimmed.length === 0 ? Number.NaN : Number(trimmed);
}

/**
 * Anything unusable becomes the default rather than an error: a missing or
 * malformed limit is a caller's mistake, not a reason to refuse the answer.
 * A number below one is a request for nothing, which is never what the caller
 * meant, so it becomes one.
 */
export function boundSimilarLimit(raw: unknown): number {
  const requested = asNumber(raw);
  if (!Number.isFinite(requested)) return SIMILAR_COMPANIES_DEFAULT_LIMIT;

  const whole = Math.floor(requested);
  if (whole < 1) return 1;
  return Math.min(whole, SIMILAR_COMPANIES_MAX_LIMIT);
}
