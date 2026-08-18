/** URL search param for the discovery query. */
export const SEARCH_QUERY_PARAM = 'q';

/** Result page size for the search surface (matches browse page size). */
export const SEARCH_UI_LIMIT = 24;

export const SEARCH_UI_COPY = {
  emptyTitle: 'No matching companies',
  emptyDescription:
    'Try a different query, or clear search to browse all companies.',
  errorTitle: 'Unable to search',
  errorDescription:
    'Something went wrong while searching. Please try again later.',
} as const;

export type SearchUiSurface = 'browse' | 'results' | 'empty' | 'error';

/**
 * Normalize a raw `q` search param from Next searchParams.
 * Arrays take the first string entry. Whitespace-only becomes empty.
 */
export function normalizeSearchQuery(
  raw: string | string[] | undefined | null,
): string {
  if (raw == null) {
    return '';
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

export function isSearchMode(
  raw: string | string[] | undefined | null,
): boolean {
  return normalizeSearchQuery(raw).length > 0;
}

/** Shareable path for a query; empty query returns browse home. */
export function buildSearchPath(query: string): string {
  const q = query.trim();
  if (q.length === 0) {
    return '/';
  }
  return `/?${SEARCH_QUERY_PARAM}=${encodeURIComponent(q)}`;
}

/**
 * Decide which search UI surface to render from a normalized query and
 * server result status. Pure; no I/O.
 */
export function resolveSearchSurface(input: {
  query: string;
  status: 'ok' | 'error';
  resultCount: number;
}): SearchUiSurface {
  if (input.query.length === 0) {
    return 'browse';
  }
  if (input.status === 'error') {
    return 'error';
  }
  if (input.resultCount === 0) {
    return 'empty';
  }
  return 'results';
}
