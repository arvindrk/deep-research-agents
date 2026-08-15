import { getDBClient } from '../client';
import { STATEMENT_TIMEOUT_MS } from '../resilience';
import {
  assertEmbeddingDimensions,
  type CompanyEmbeddingFields,
} from '@/lib/company-embedding';
import {
  HYBRID_SEARCH_FILTERS,
  HYBRID_SEARCH_WEIGHTS,
} from '@/lib/hybrid-search-ranking';
import type { Company, SearchResult, QueryResult, PaginatedResult } from '../types';

export { HYBRID_SEARCH_WEIGHTS };

const HNSW_EF_SEARCH = 200;

/** Columns needed to compose embedding input; never includes the vector. */
export type CompanyEmbeddingSource = {
  id: string;
  name: string;
  one_liner: string | null;
  long_description: string | null;
  tags: string[];
  industries: string[];
  regions: string[];
  batch: string | null;
  stage: string | null;
};

export async function getCompanyById(id: string): Promise<QueryResult<Company>> {
  try {
    const sql = getDBClient();
    const results = await sql`
      SELECT 
        id, source, source_id, source_url, name, slug, website, logo_url,
        one_liner, long_description, tags, industries, regions, batch,
        team_size, founded_at, stage, status, is_hiring, is_nonprofit,
        all_locations, source_metadata, created_at, updated_at, last_synced_at
      FROM companies
      WHERE id = ${id}
    `;

    if (results.length === 0) {
      return { success: false, error: 'Company not found' };
    }

    return { success: true, data: results[0] as Company };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function getAllCompanies(
  cursor?: string,
  limit: number = 50
): Promise<QueryResult<PaginatedResult<Company>>> {
  try {
    const sql = getDBClient();
    
    const results = cursor
      ? await sql`
          SELECT 
            id, source, source_id, source_url, name, slug, website, logo_url,
            one_liner, long_description, tags, industries, regions, batch,
            team_size, founded_at, stage, status, is_hiring, is_nonprofit,
            all_locations, source_metadata, created_at, updated_at, last_synced_at
          FROM companies
          WHERE id > ${cursor}
          ORDER BY id
          LIMIT ${limit + 1}
        `
      : await sql`
          SELECT 
            id, source, source_id, source_url, name, slug, website, logo_url,
            one_liner, long_description, tags, industries, regions, batch,
            team_size, founded_at, stage, status, is_hiring, is_nonprofit,
            all_locations, source_metadata, created_at, updated_at, last_synced_at
          FROM companies
          ORDER BY id
          LIMIT ${limit + 1}
        `;

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      success: true,
      data: {
        items: items as Company[],
        nextCursor,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getCompaniesWithOffset(
  offset: number,
  limit: number = 24
): Promise<QueryResult<Company[]>> {
  try {
    const sql = getDBClient();
    
    const results = await sql`
      SELECT 
        id, source, source_id, source_url, name, slug, website, logo_url,
        one_liner, long_description, tags, industries, regions, batch,
        team_size, founded_at, stage, status, is_hiring, is_nonprofit,
        all_locations, source_metadata, created_at, updated_at, last_synced_at
      FROM companies
      ORDER BY id
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return { success: true, data: results as Company[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getCompanyCount(): Promise<QueryResult<number>> {
  try {
    const sql = getDBClient();
    const results = await sql`
      SELECT COUNT(*) as count
      FROM companies
    `;

    return { success: true, data: Number(results[0].count) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function searchCompanies(
  query: string,
  embedding: number[],
  limit: number = 50
): Promise<QueryResult<SearchResult[]>> {
  try {
    const sql = getDBClient();

    const embeddingJSON = JSON.stringify(embedding);

    const { semantic, nameTrigram, fullText } = HYBRID_SEARCH_WEIGHTS;
    const { minSemantic, minNameTrigram } = HYBRID_SEARCH_FILTERS;

    // `SET` takes no bound parameter, and over the HTTP driver each statement
    // is its own transaction, so a separate SET never reached this query.
    // set_config with is_local = true, in one transaction, does.
    const [, , results] = await sql.transaction([
      sql`SELECT set_config('hnsw.ef_search', ${String(HNSW_EF_SEARCH)}, true)`,
      sql`SELECT set_config('statement_timeout', ${String(STATEMENT_TIMEOUT_MS)}, true)`,
      sql`
      SELECT 
        id, source, source_id, source_url, name, slug, website, logo_url,
        one_liner, long_description, tags, industries, regions, batch,
        team_size, founded_at, stage, status, is_hiring, is_nonprofit,
        all_locations, source_metadata, created_at, updated_at, last_synced_at,
        (
          (1 - (embedding <=> ${embeddingJSON}::vector)) * ${semantic} + 
          similarity(name, ${query}) * ${nameTrigram} +
          ts_rank_cd(search_vector, plainto_tsquery('english', ${query})) * ${fullText}
        ) AS relevance_score
      FROM companies
      WHERE 
        (1 - (embedding <=> ${embeddingJSON}::vector)) >= ${minSemantic}
        OR similarity(name, ${query}) >= ${minNameTrigram}
      ORDER BY relevance_score DESC
      LIMIT ${limit}
    `,
    ]);

    return { success: true, data: results as SearchResult[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Page of companies with null embeddings for backfill. Selects only id and
 * text fields used as embedding input (never the embedding column itself).
 */
export async function listCompaniesMissingEmbeddings(
  limit: number = 50,
  cursor?: string,
): Promise<QueryResult<CompanyEmbeddingSource[]>> {
  try {
    const sql = getDBClient();

    const results = cursor
      ? await sql`
          SELECT
            id, name, one_liner, long_description, tags, industries, regions,
            batch, stage
          FROM companies
          WHERE embedding IS NULL AND id > ${cursor}
          ORDER BY id
          LIMIT ${limit}
        `
      : await sql`
          SELECT
            id, name, one_liner, long_description, tags, industries, regions,
            batch, stage
          FROM companies
          WHERE embedding IS NULL
          ORDER BY id
          LIMIT ${limit}
        `;

    return { success: true, data: results as CompanyEmbeddingSource[] };
  } catch {
    return {
      success: false,
      error: 'Failed to list companies missing embeddings',
    };
  }
}

/**
 * Persist a full embedding vector for one company. Asserts dimensions before
 * write; uses JSON + ::vector like searchCompanies.
 */
export async function updateCompanyEmbedding(
  id: string,
  embedding: number[],
): Promise<QueryResult<{ id: string }>> {
  try {
    assertEmbeddingDimensions(embedding);
    const sql = getDBClient();
    const embeddingJSON = JSON.stringify(embedding);

    const results = await sql`
      UPDATE companies
      SET embedding = ${embeddingJSON}::vector
      WHERE id = ${id}
      RETURNING id
    `;

    if (results.length === 0) {
      return { success: false, error: 'Company not found' };
    }

    return { success: true, data: { id: results[0].id as string } };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Expected embedding length')) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: 'Failed to update company embedding',
    };
  }
}

/** Map a slim embedding source row to the pure text builder fields. */
export function toEmbeddingFields(
  row: CompanyEmbeddingSource,
): CompanyEmbeddingFields {
  return {
    name: row.name,
    one_liner: row.one_liner,
    long_description: row.long_description,
    tags: row.tags,
    industries: row.industries,
    regions: row.regions,
    batch: row.batch,
    stage: row.stage,
  };
}
