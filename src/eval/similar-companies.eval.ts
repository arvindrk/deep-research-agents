import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  boundSimilarLimit,
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
