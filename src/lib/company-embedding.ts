/** Matches text-embedding-3-small default width and the pgvector column. */
export const EMBEDDING_DIMENSIONS = 1536;

/** Default page size for missing-embedding backfill. */
export const DEFAULT_EMBEDDING_BATCH_SIZE = 32;

export type CompanyEmbeddingFields = {
  name: string;
  one_liner?: string | null;
  long_description?: string | null;
  tags?: readonly string[] | null;
  industries?: readonly string[] | null;
  regions?: readonly string[] | null;
  batch?: string | null;
  stage?: string | null;
};

/**
 * Stable text composition for company embeddings. Query-time embedding for
 * search must use the same fields so vectors land in the same space.
 */
export function buildCompanyEmbeddingText(company: CompanyEmbeddingFields): string {
  const parts: string[] = [];

  const name = company.name.trim();
  if (name) parts.push(name);

  const oneLiner = company.one_liner?.trim();
  if (oneLiner) parts.push(oneLiner);

  const description = company.long_description?.trim();
  if (description) parts.push(description);

  const industries = joinList(company.industries);
  if (industries) parts.push(`Industries: ${industries}`);

  const tags = joinList(company.tags);
  if (tags) parts.push(`Tags: ${tags}`);

  const regions = joinList(company.regions);
  if (regions) parts.push(`Regions: ${regions}`);

  const batch = company.batch?.trim();
  if (batch) parts.push(`Batch: ${batch}`);

  const stage = company.stage?.trim();
  if (stage) parts.push(`Stage: ${stage}`);

  return parts.join('\n');
}

export function assertEmbeddingDimensions(vector: readonly number[]): number[] {
  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected embedding length ${EMBEDDING_DIMENSIONS}, got ${vector.length}`,
    );
  }
  return [...vector];
}

/** Number of batches needed to cover `total` items at `batchSize`. */
export function embeddingBatchCount(total: number, batchSize: number): number {
  if (!Number.isFinite(total) || total < 0) {
    throw new Error('total must be a non-negative finite number');
  }
  if (!Number.isFinite(batchSize) || batchSize < 1) {
    throw new Error('batchSize must be a finite number >= 1');
  }
  if (total === 0) return 0;
  return Math.ceil(total / batchSize);
}

function joinList(values: readonly string[] | null | undefined): string | null {
  if (!values || values.length === 0) return null;
  const cleaned = values.map((v) => v.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  return cleaned.join(', ');
}
