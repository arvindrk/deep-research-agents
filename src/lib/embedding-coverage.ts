import { EMBEDDING_DIMENSIONS } from './company-embedding';

/**
 * CI bar for hybrid search readiness: share of companies with a usable
 * embedding (semantic path available) versus fallback-only (name/full-text).
 */
export const EMBEDDING_COVERAGE_BAR = {
  minCoverage: 0.5,
} as const;

export type EmbeddingCoverageBar = {
  readonly minCoverage: number;
};

/** Fixture or inventory row: length only, never the full vector. */
export type EmbeddingCoverageRow = {
  id: string;
  /** Null when the embedding column is null; otherwise the vector width. */
  embeddingLength: number | null;
};

export type EmbeddingCoverageReport = {
  total: number;
  usable: number;
  fallbackOnly: number;
  /** usable / total, or 0 when the inventory is empty. */
  coverage: number;
};

/** Usable for hybrid semantic scoring: present and exactly EMBEDDING_DIMENSIONS. */
export function isUsableEmbedding(
  embedding: readonly number[] | null | undefined,
): boolean {
  return embedding != null && embedding.length === EMBEDDING_DIMENSIONS;
}

/** Same rule when only the stored length is known (avoids shipping 1536-d fixtures). */
export function isUsableEmbeddingLength(
  length: number | null | undefined,
): boolean {
  return length === EMBEDDING_DIMENSIONS;
}

/**
 * How many companies have usable embeddings versus fallback-only
 * (null or wrong-length vectors that cannot contribute to semantic score).
 */
export function measureEmbeddingCoverage(
  rows: readonly EmbeddingCoverageRow[],
): EmbeddingCoverageReport {
  const total = rows.length;
  let usable = 0;
  for (const row of rows) {
    if (isUsableEmbeddingLength(row.embeddingLength)) usable += 1;
  }
  const fallbackOnly = total - usable;
  return {
    total,
    usable,
    fallbackOnly,
    coverage: total === 0 ? 0 : usable / total,
  };
}

/** Readable violations when coverage sits below the bar. */
export function embeddingCoverageViolations(
  report: EmbeddingCoverageReport,
  bar: EmbeddingCoverageBar = EMBEDDING_COVERAGE_BAR,
): string[] {
  const violations: string[] = [];
  if (report.coverage < bar.minCoverage) {
    violations.push(
      `embedding coverage ${report.coverage.toFixed(2)} is below ${bar.minCoverage}`,
    );
  }
  return violations;
}
