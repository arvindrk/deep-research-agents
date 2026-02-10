import { getDBClient } from '../client';
import type { Company, SearchResult, QueryResult, PaginatedResult } from '../types';

const HNSW_EF_SEARCH = 200;

export async function getCompanyById(id: string): Promise<QueryResult<Company>> {
  try {
    const sql = getDBClient();
    const results = await sql`
      SELECT 
        id, source, source_id, source_url, name, slug, website, logo_url,
        one_liner, long_description, tags, industries, regions, batch,
        team_size, founded_at, stage, status, is_hiring, is_nonprofit,
        all_locations, source_metadata, created_at, updated_at, last_synced_at,
        embedding
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
            all_locations, source_metadata, created_at, updated_at, last_synced_at,
            embedding
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
            all_locations, source_metadata, created_at, updated_at, last_synced_at,
            embedding
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

    await sql`SET hnsw.ef_search = ${HNSW_EF_SEARCH}`;

    const embeddingJSON = JSON.stringify(embedding);

    const results = await sql`
      SELECT 
        id, source, source_id, source_url, name, slug, website, logo_url,
        one_liner, long_description, tags, industries, regions, batch,
        team_size, founded_at, stage, status, is_hiring, is_nonprofit,
        all_locations, source_metadata, created_at, updated_at, last_synced_at,
        embedding,
        (
          (1 - (embedding <=> ${embeddingJSON}::vector)) * 0.7 + 
          similarity(name, ${query}) * 0.2 +
          ts_rank_cd(search_vector, plainto_tsquery('english', ${query})) * 0.1
        ) AS relevance_score
      FROM companies
      WHERE 
        (1 - (embedding <=> ${embeddingJSON}::vector)) >= 0.25
        OR similarity(name, ${query}) >= 0.3
      ORDER BY relevance_score DESC
      LIMIT ${limit}
    `;

    return { success: true, data: results as SearchResult[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
