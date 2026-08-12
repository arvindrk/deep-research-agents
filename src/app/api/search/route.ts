import { NextResponse } from 'next/server';

import { searchCompanies } from '@/db/queries/companies';
import { embedText } from '@/lib/embed';
import { parseHybridSearchInput } from '@/lib/hybrid-search-input';
import { toPublicSearchResults } from '@/lib/hybrid-search-result';

const INVALID_REQUEST = { error: 'Invalid search request' };
const EMBED_UNAVAILABLE = { error: 'Search temporarily unavailable' };
const SEARCH_FAILED = { error: 'Search failed' };

/**
 * Hybrid company search. Validates at the boundary, embeds the query, then
 * ranks via searchCompanies. Never returns embedding vectors or raw
 * driver/provider errors.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const parsed = parseHybridSearchInput({
    q: searchParams.get('q'),
    limit: searchParams.get('limit'),
  });

  if (!parsed.ok) {
    return NextResponse.json(INVALID_REQUEST, { status: 400 });
  }

  const { query, limit } = parsed.value;

  let embedding: number[];
  try {
    embedding = await embedText(query);
  } catch {
    return NextResponse.json(EMBED_UNAVAILABLE, { status: 502 });
  }

  const result = await searchCompanies(query, embedding, limit);
  if (!result.success) {
    return NextResponse.json(SEARCH_FAILED, { status: 503 });
  }

  return NextResponse.json({
    results: toPublicSearchResults(result.data),
  });
}
