import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { HYBRID_SEARCH_FILTERS } from '@/lib/hybrid-search-ranking';
import {
  boundSimilarLimit,
  similarityFromDistance,
  SIMILAR_COMPANIES_MIN_SIMILARITY,
  SIMILAR_COMPANIES_DEFAULT_LIMIT,
  SIMILAR_COMPANIES_MAX_LIMIT,
} from '@/lib/similar-companies';

describe('boundSimilarLimit', () => {
  it('passes a sensible request through', () => {
    for (const limit of [1, 3, 6, 12, SIMILAR_COMPANIES_MAX_LIMIT]) {
      assert.equal(boundSimilarLimit(limit), limit);
    }
  });

  it('answers the default when there is no usable limit', () => {
    for (const raw of [undefined, null, '', '   ', 'six', {}, [], true, NaN, Infinity]) {
      assert.equal(
        boundSimilarLimit(raw),
        SIMILAR_COMPANIES_DEFAULT_LIMIT,
        JSON.stringify(raw ?? null),
      );
    }
  });

  it('reads a limit written down, as a URL carries it', () => {
    assert.equal(boundSimilarLimit('8'), 8);
    assert.equal(boundSimilarLimit(' 8 '), 8);
  });

  it('never returns nothing, and never returns everything', () => {
    for (const raw of [0, -1, -1000, 0.4, '0']) {
      assert.equal(boundSimilarLimit(raw), 1, String(raw));
    }
    for (const raw of [25, 1000, '10000', Number.MAX_SAFE_INTEGER]) {
      assert.equal(boundSimilarLimit(raw), SIMILAR_COMPANIES_MAX_LIMIT, String(raw));
    }
  });

  it('returns a whole number a LIMIT can take', () => {
    for (const raw of [1.9, 6.5, 23.999, '7.2']) {
      const bounded = boundSimilarLimit(raw);
      assert.equal(Number.isInteger(bounded), true, String(raw));
      assert.ok(bounded >= 1 && bounded <= SIMILAR_COMPANIES_MAX_LIMIT);
    }
  });

  it('keeps the default inside the bounds it enforces', () => {
    assert.ok(SIMILAR_COMPANIES_DEFAULT_LIMIT >= 1);
    assert.ok(SIMILAR_COMPANIES_DEFAULT_LIMIT <= SIMILAR_COMPANIES_MAX_LIMIT);
  });
});

describe('similarityFromDistance', () => {
  it('turns the ends of the range into the ends of the score', () => {
    assert.equal(similarityFromDistance(0), 1);
    assert.equal(similarityFromDistance(1), 0);
    assert.equal(similarityFromDistance(2), 0);
  });

  it('is the complement of the distance in between', () => {
    for (const distance of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      assert.equal(
        Number(similarityFromDistance(distance).toFixed(10)),
        Number((1 - distance).toFixed(10)),
      );
    }
  });

  it('never leaves the range a reader can be shown', () => {
    for (const distance of [-5, -1, -0.0001, 0, 0.5, 1, 1.0001, 2, 17]) {
      const score = similarityFromDistance(distance);
      assert.ok(score >= 0 && score <= 1, String(distance));
    }
  });

  it('scores an unusable distance as nothing, not as everything', () => {
    for (const distance of [NaN, Infinity, -Infinity]) {
      assert.equal(similarityFromDistance(distance), 0, String(distance));
    }
  });

  it('falls short of the floor for a distance the query would exclude', () => {
    const excluded = 1 - SIMILAR_COMPANIES_MIN_SIMILARITY + 0.01;
    assert.ok(similarityFromDistance(excluded) < SIMILAR_COMPANIES_MIN_SIMILARITY);
    const included = 1 - SIMILAR_COMPANIES_MIN_SIMILARITY - 0.01;
    assert.ok(similarityFromDistance(included) > SIMILAR_COMPANIES_MIN_SIMILARITY);
  });
});

describe('how close counts as related', () => {
  it('is the judgement search already makes, not a second one', () => {
    assert.equal(
      SIMILAR_COMPANIES_MIN_SIMILARITY,
      HYBRID_SEARCH_FILTERS.minSemantic,
      'the floor must be the search floor, so the two surfaces agree',
    );
  });

  it('is read from the search module rather than copied', () => {
    assert.match(
      readFileSync(join(process.cwd(), 'src/lib/similar-companies.ts'), 'utf8'),
      /SIMILAR_COMPANIES_MIN_SIMILARITY = HYBRID_SEARCH_FILTERS\.minSemantic/,
    );
  });
});
