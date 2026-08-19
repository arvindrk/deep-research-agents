export { getDBClient } from './client';
export {
  backoffDelayMs,
  isTransientDatabaseError,
  withRetry,
  RETRY_ATTEMPTS,
  STATEMENT_TIMEOUT_MS,
} from './resilience';
export type { Company, SearchResult, QueryResult, PaginatedResult } from './types';
export {
  getCompanyById,
  getAllCompanies,
  getCompanyCount,
  getCompaniesWithOffset,
  searchCompanies,
  listCompaniesMissingEmbeddings,
  updateCompanyEmbedding,
  toEmbeddingFields,
  getCompanyBySource,
  insertCompanyFromSource,
  updateCompanyFromSource,
  touchCompanySyncedAt,
  type CompanyEmbeddingSource,
} from './queries/companies';
