/** Every terminal outcome of a search request, in the order the route hits them. */
export const SEARCH_OUTCOMES = [
  'ok',
  'invalid_request',
  'embed_unavailable',
  'search_failed',
] as const;

export type SearchOutcome = (typeof SEARCH_OUTCOMES)[number];
