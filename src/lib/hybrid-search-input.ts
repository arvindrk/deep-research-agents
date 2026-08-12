/** Matches searchCompanies default; hard cap for client-supplied limits. */
export const HYBRID_SEARCH_MAX_LIMIT = 50;

export type HybridSearchInput = {
  query: string;
  limit: number;
};

export type HybridSearchParseResult =
  | { ok: true; value: HybridSearchInput }
  | { ok: false; error: 'invalid_query' | 'invalid_limit' };

/**
 * Pure boundary validation for hybrid search. No I/O.
 * `q` must be non-empty after trim. `limit` is optional; when present must be
 * an integer in [1, HYBRID_SEARCH_MAX_LIMIT].
 */
export function parseHybridSearchInput(raw: {
  q?: string | null;
  limit?: string | null;
}): HybridSearchParseResult {
  const query = typeof raw.q === 'string' ? raw.q.trim() : '';
  if (query.length === 0) {
    return { ok: false, error: 'invalid_query' };
  }

  if (raw.limit == null || raw.limit === '') {
    return { ok: true, value: { query, limit: HYBRID_SEARCH_MAX_LIMIT } };
  }

  if (typeof raw.limit !== 'string' || !/^\d+$/.test(raw.limit)) {
    return { ok: false, error: 'invalid_limit' };
  }

  const limit = Number(raw.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > HYBRID_SEARCH_MAX_LIMIT) {
    return { ok: false, error: 'invalid_limit' };
  }

  return { ok: true, value: { query, limit } };
}
