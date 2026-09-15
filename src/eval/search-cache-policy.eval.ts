import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SEARCH_OUTCOMES,
  type SearchOutcome,
} from '@/lib/observability/search-event';
import {
  searchCacheHeaders,
  SEARCH_CACHE_CONTROL,
  SEARCH_CACHE_NO_STORE,
  SEARCH_CACHE_SHARED_MAX_AGE_SECONDS,
  SEARCH_CACHE_STALE_WHILE_REVALIDATE_SECONDS,
} from '@/lib/search-cache-policy';

const FAILURES: SearchOutcome[] = [
  'invalid_request',
  'embed_unavailable',
  'search_failed',
];

describe('the search cache policy', () => {
  it('decides one policy for every outcome the route can reach', () => {
    assert.deepEqual(
      Object.keys(SEARCH_CACHE_CONTROL).sort(),
      [...SEARCH_OUTCOMES].sort(),
    );
    for (const outcome of SEARCH_OUTCOMES) {
      assert.equal(typeof SEARCH_CACHE_CONTROL[outcome], 'string');
      assert.ok(SEARCH_CACHE_CONTROL[outcome].length > 0, outcome);
    }
  });

  it('lets a shared cache hold a successful answer briefly', () => {
    const ok = SEARCH_CACHE_CONTROL.ok;
    assert.match(ok, /\bpublic\b/);
    assert.match(ok, new RegExp(`s-maxage=${SEARCH_CACHE_SHARED_MAX_AGE_SECONDS}\\b`));
    assert.match(
      ok,
      new RegExp(
        `stale-while-revalidate=${SEARCH_CACHE_STALE_WHILE_REVALIDATE_SECONDS}\\b`,
      ),
    );
  });

  it('keeps the reader own view fresh', () => {
    assert.match(SEARCH_CACHE_CONTROL.ok, /\bmax-age=0\b/);
    assert.doesNotMatch(SEARCH_CACHE_CONTROL.ok, /max-age=[1-9]/);
  });

  it('stores no refusal and no failure', () => {
    for (const outcome of FAILURES) {
      assert.equal(SEARCH_CACHE_CONTROL[outcome], SEARCH_CACHE_NO_STORE, outcome);
      assert.doesNotMatch(SEARCH_CACHE_CONTROL[outcome], /s-maxage|public/);
    }
  });

  it('gives only the successful answer a shared lifetime', () => {
    const shared = SEARCH_OUTCOMES.filter((outcome) =>
      /s-maxage/.test(SEARCH_CACHE_CONTROL[outcome]),
    );
    assert.deepEqual(shared, ['ok']);
  });

  it('keeps the lifetimes short enough to be honest', () => {
    assert.ok(SEARCH_CACHE_SHARED_MAX_AGE_SECONDS > 0);
    assert.ok(SEARCH_CACHE_SHARED_MAX_AGE_SECONDS <= 300);
    assert.ok(
      SEARCH_CACHE_STALE_WHILE_REVALIDATE_SECONDS >=
        SEARCH_CACHE_SHARED_MAX_AGE_SECONDS,
    );
  });

  it('hands an exit the header, so no exit spells the policy itself', () => {
    for (const outcome of SEARCH_OUTCOMES) {
      assert.deepEqual(searchCacheHeaders(outcome), {
        'Cache-Control': SEARCH_CACHE_CONTROL[outcome],
      });
    }
  });
});
