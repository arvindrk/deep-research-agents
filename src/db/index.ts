export { getDBClient } from './client';
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
  type CompanyEmbeddingSource,
} from './queries/companies';
