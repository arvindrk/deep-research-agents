import type { SearchResult } from '@/db/types';

/** Client-safe search hit: never includes embedding vectors. */
export type PublicSearchResult = Omit<SearchResult, 'embedding'>;

/** Strip embedding (and any other non-public fields) before JSON serialization. */
export function toPublicSearchResult(row: SearchResult): PublicSearchResult {
  const { embedding: _embedding, ...rest } = row;
  return rest;
}

export function toPublicSearchResults(rows: SearchResult[]): PublicSearchResult[] {
  return rows.map(toPublicSearchResult);
}
