/**
 * Pure hybrid ranking: same linear combination and inclusion filters as
 * searchCompanies SQL. Component scores are fixed inputs here so ranking
 * can be locked without a database.
 *
 * SQL counterpart (companies.searchCompanies):
 *   relevance = (1 - embedding<=>q) * semantic
 *             + similarity(name, q) * nameTrigram
 *             + ts_rank_cd(...) * fullText
 *   WHERE semantic >= minSemantic OR nameTrigram >= minNameTrigram
 *   ORDER BY relevance DESC
 */

/** Product weights. Changing them changes result order; locked by eval. */
export const HYBRID_SEARCH_WEIGHTS = {
  semantic: 0.7,
  nameTrigram: 0.2,
  fullText: 0.1,
} as const;

export type HybridSearchWeights = typeof HYBRID_SEARCH_WEIGHTS;

/** Inclusion thresholds from searchCompanies WHERE. */
export const HYBRID_SEARCH_FILTERS = {
  minSemantic: 0.25,
  minNameTrigram: 0.3,
} as const;

export type HybridSearchFilters = typeof HYBRID_SEARCH_FILTERS;

/** Per-row component scores as produced by the SQL expressions above. */
export type HybridComponentScores = {
  /** 1 - (embedding <=> query_vector) */
  semantic: number;
  /** similarity(name, query) */
  nameTrigram: number;
  /** ts_rank_cd(search_vector, plainto_tsquery(...)) */
  fullText: number;
};

export type HybridRankable = HybridComponentScores & {
  id: string;
};

export type HybridRanked = HybridRankable & {
  relevance_score: number;
};

/** Linear combination matching the searchCompanies SELECT expression. */
export function hybridRelevanceScore(
  components: HybridComponentScores,
  weights: HybridSearchWeights = HYBRID_SEARCH_WEIGHTS,
): number {
  return (
    components.semantic * weights.semantic +
    components.nameTrigram * weights.nameTrigram +
    components.fullText * weights.fullText
  );
}

/** Same OR filter as searchCompanies WHERE. */
export function passesHybridFilter(
  components: HybridComponentScores,
  filters: HybridSearchFilters = HYBRID_SEARCH_FILTERS,
): boolean {
  return (
    components.semantic >= filters.minSemantic ||
    components.nameTrigram >= filters.minNameTrigram
  );
}

/**
 * Filter to candidates that would hit the SQL WHERE, score, then order by
 * relevance descending. Ties break by id ascending for a stable order.
 */
export function rankHybridResults(
  rows: readonly HybridRankable[],
  options?: {
    weights?: HybridSearchWeights;
    filters?: HybridSearchFilters;
  },
): HybridRanked[] {
  const weights = options?.weights ?? HYBRID_SEARCH_WEIGHTS;
  const filters = options?.filters ?? HYBRID_SEARCH_FILTERS;

  const ranked: HybridRanked[] = [];
  for (const row of rows) {
    if (!passesHybridFilter(row, filters)) {
      continue;
    }
    ranked.push({
      ...row,
      relevance_score: hybridRelevanceScore(row, weights),
    });
  }

  ranked.sort((a, b) => {
    if (b.relevance_score !== a.relevance_score) {
      return b.relevance_score - a.relevance_score;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return ranked;
}
