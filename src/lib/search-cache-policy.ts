import { NO_STORE, sharedAnswerPolicy } from './http-cache-policy';
import type { SearchOutcome } from './observability/search-event';

/**
 * How long a shared cache may serve one search answer. A minute absorbs the
 * repeat a reader makes by pressing enter twice, and by refreshing, without
 * hiding a company that has just been ingested for longer than a minute.
 */
export const SEARCH_CACHE_SHARED_MAX_AGE_SECONDS = 60;

/**
 * How long a shared cache may keep serving the stale answer while it fetches a
 * fresh one. A slow embedding call should cost one reader a wait, not all of
 * them.
 */
export const SEARCH_CACHE_STALE_WHILE_REVALIDATE_SECONDS = 300;

export const SEARCH_CACHE_NO_STORE = NO_STORE;

/**
 * `public` is safe here, and it is the part worth justifying. The answer is a
 * ranked list of public company records derived from the query string alone:
 * the route reads no cookie, no authorization header, and nothing else about
 * the reader, it sets no cookie, and it never echoes the query into the body.
 * Two readers sending the same URL are owed the same bytes.
 *
 * `max-age=0` keeps the reader's own view honest: their browser revalidates, so
 * a company ingested a moment ago can appear on their next search, while the
 * shared cache still absorbs the repeat.
 *
 * Failures and refusals are never stored. A cached 503 outlives the outage it
 * describes, and a cached 400 saves nothing, because rejecting the same bad
 * input again is free.
 */
export const SEARCH_CACHE_CONTROL: Record<SearchOutcome, string> = {
  ok: sharedAnswerPolicy(
    SEARCH_CACHE_SHARED_MAX_AGE_SECONDS,
    SEARCH_CACHE_STALE_WHILE_REVALIDATE_SECONDS,
  ),
  invalid_request: SEARCH_CACHE_NO_STORE,
  embed_unavailable: SEARCH_CACHE_NO_STORE,
  search_failed: SEARCH_CACHE_NO_STORE,
};

/** The headers one search exit sends, so no exit spells the policy itself. */
export function searchCacheHeaders(
  outcome: SearchOutcome,
): Record<string, string> {
  return { 'Cache-Control': SEARCH_CACHE_CONTROL[outcome] };
}
