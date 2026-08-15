import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  HYBRID_SEARCH_FILTERS,
  HYBRID_SEARCH_WEIGHTS,
  hybridRelevanceScore,
  passesHybridFilter,
  rankHybridResults,
  type HybridRankable,
  type HybridSearchWeights,
} from '@/lib/hybrid-search-ranking';

/**
 * Fixed component scores (not live vectors). Chosen so default 0.7/0.2/0.1
 * yields a single deterministic id order; swapping semantic and nameTrigram
 * weights reorders (canary).
 *
 * Expected scores under product weights:
 *   sem-king:   0.95*0.7 + 0.10*0.2 + 0.10*0.1 = 0.695
 *   mid:        0.50*0.7 + 0.50*0.2 + 0.50*0.1 = 0.500
 *   full-boost: 0.40*0.7 + 0.40*0.2 + 1.00*0.1 = 0.460
 *   name-king:  0.30*0.7 + 1.00*0.2 + 0.00*0.1 = 0.410
 *   noise:      filtered (semantic 0.1, name 0.1)
 */
const FIXTURES: HybridRankable[] = [
  { id: 'name-king', semantic: 0.3, nameTrigram: 1.0, fullText: 0.0 },
  { id: 'noise', semantic: 0.1, nameTrigram: 0.1, fullText: 1.0 },
  { id: 'full-boost', semantic: 0.4, nameTrigram: 0.4, fullText: 1.0 },
  { id: 'sem-king', semantic: 0.95, nameTrigram: 0.1, fullText: 0.1 },
  { id: 'mid', semantic: 0.5, nameTrigram: 0.5, fullText: 0.5 },
];

const EXPECTED_ORDER_DEFAULT = ['sem-king', 'mid', 'full-boost', 'name-king'];

describe('HYBRID_SEARCH_WEIGHTS (ranking module)', () => {
  it('locks semantic / name trigram / full-text at 0.7 / 0.2 / 0.1', () => {
    assert.equal(HYBRID_SEARCH_WEIGHTS.semantic, 0.7);
    assert.equal(HYBRID_SEARCH_WEIGHTS.nameTrigram, 0.2);
    assert.equal(HYBRID_SEARCH_WEIGHTS.fullText, 0.1);
  });
});

describe('HYBRID_SEARCH_FILTERS', () => {
  it('locks minSemantic 0.25 and minNameTrigram 0.3', () => {
    assert.equal(HYBRID_SEARCH_FILTERS.minSemantic, 0.25);
    assert.equal(HYBRID_SEARCH_FILTERS.minNameTrigram, 0.3);
  });
});

describe('hybridRelevanceScore', () => {
  it('matches the searchCompanies linear combination', () => {
    assert.equal(
      hybridRelevanceScore({ semantic: 1, nameTrigram: 1, fullText: 1 }),
      0.7 + 0.2 + 0.1,
    );
    assert.equal(
      hybridRelevanceScore({ semantic: 0.95, nameTrigram: 0.1, fullText: 0.1 }),
      0.95 * 0.7 + 0.1 * 0.2 + 0.1 * 0.1,
    );
  });
});

describe('passesHybridFilter', () => {
  it('includes rows at or above either threshold', () => {
    assert.equal(
      passesHybridFilter({ semantic: 0.25, nameTrigram: 0, fullText: 0 }),
      true,
    );
    assert.equal(
      passesHybridFilter({ semantic: 0, nameTrigram: 0.3, fullText: 0 }),
      true,
    );
  });

  it('excludes rows below both thresholds even with high full-text', () => {
    assert.equal(
      passesHybridFilter({ semantic: 0.24, nameTrigram: 0.29, fullText: 1 }),
      false,
    );
  });
});

describe('rankHybridResults', () => {
  it('orders fixtures by product weights and drops filter misses', () => {
    const ranked = rankHybridResults(FIXTURES);
    assert.deepEqual(
      ranked.map((r) => r.id),
      EXPECTED_ORDER_DEFAULT,
    );
    assert.ok(!ranked.some((r) => r.id === 'noise'));
    assert.equal(ranked[0].relevance_score, hybridRelevanceScore(FIXTURES[3]));
  });

  it('is deterministic for the same fixtures', () => {
    const a = rankHybridResults(FIXTURES).map((r) => r.id);
    const b = rankHybridResults(FIXTURES).map((r) => r.id);
    assert.deepEqual(a, b);
  });

  it('reorders when semantic and nameTrigram weights are swapped', () => {
    const swapped: HybridSearchWeights = {
      semantic: 0.2,
      nameTrigram: 0.7,
      fullText: 0.1,
    };
    const ranked = rankHybridResults(FIXTURES, { weights: swapped });
    assert.deepEqual(
      ranked.map((r) => r.id),
      ['name-king', 'mid', 'full-boost', 'sem-king'],
    );
    assert.notDeepEqual(
      ranked.map((r) => r.id),
      EXPECTED_ORDER_DEFAULT,
    );
  });

  it('breaks equal relevance by id ascending', () => {
    const tied: HybridRankable[] = [
      { id: 'b', semantic: 0.5, nameTrigram: 0, fullText: 0 },
      { id: 'a', semantic: 0.5, nameTrigram: 0, fullText: 0 },
    ];
    assert.deepEqual(
      rankHybridResults(tied).map((r) => r.id),
      ['a', 'b'],
    );
  });
});
