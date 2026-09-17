import { HYBRID_SEARCH_FILTERS } from './hybrid-search-ranking';

/**
 * How close is close enough to be worth showing. This is the same judgement
 * search already makes about what counts as semantically related, so it is
 * reused rather than redefined: two constants for one judgement drift, and the
 * drift shows up as a company appearing in one place and not the other.
 */
export const SIMILAR_COMPANIES_MIN_SIMILARITY = HYBRID_SEARCH_FILTERS.minSemantic;

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

/**
 * A cosine distance from pgvector's `<=>`, as a score a reader can be shown.
 * Identical vectors are 0 distance and score 1; opposite ones score 0 rather
 * than a negative number nobody can read.
 */
export function similarityFromDistance(distance: number): number {
  if (!Number.isFinite(distance)) return 0;
  return Math.min(1, Math.max(0, 1 - distance));
}
