import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

const ROUTE_PATH = 'src/app/api/search/route.ts';
const route = readFileSync(join(process.cwd(), ROUTE_PATH), 'utf8');

describe('every exit the search route takes', () => {
  const exits = route.match(/return NextResponse\.json\([\s\S]*?\);/g) ?? [];

  it('is one of the four the policy decides', () => {
    assert.equal(
      exits.length,
      SEARCH_OUTCOMES.length,
      `the route has ${exits.length} exits and the policy covers ${SEARCH_OUTCOMES.length}`,
    );
  });

  it('carries a policy, none spelled by hand', () => {
    for (const exit of exits) {
      assert.match(exit, /headers: searchCacheHeaders\('(\w+)'\)/, exit);
    }
    assert.doesNotMatch(route, /'Cache-Control'/);
    assert.doesNotMatch(route, /s-maxage|no-store/);
  });

  it('carries the same outcome it reports to the observability layer', () => {
    for (const outcome of SEARCH_OUTCOMES) {
      assert.ok(
        route.includes(`searchCacheHeaders('${outcome}')`),
        `${outcome} has no exit carrying its policy`,
      );
      assert.ok(
        route.includes(`outcome: '${outcome}'`),
        `${outcome} is no longer emitted`,
      );
    }
  });
});

describe('what makes a shared cache safe here', () => {
  it('reads nothing about the reader', () => {
    assert.doesNotMatch(route, /\bcookies\(\)|\bheaders\(\)/);
    assert.doesNotMatch(route, /authorization|Authorization/);
    assert.doesNotMatch(route, /request\.headers/);
  });

  it('sets no cookie', () => {
    assert.doesNotMatch(route, /Set-Cookie|cookies\.set/);
  });

  it('never echoes the query into the body', () => {
    // A reader can paste anything into a search box. The URL is already in
    // every access log, but the cached body must not repeat it.
    assert.match(route, /NextResponse\.json\(\s*\{ results \}/);
    assert.doesNotMatch(route, /json\(\{[^}]*\bquery\b/);
  });

  it('lets the headers be the whole policy', () => {
    assert.doesNotMatch(route, /export const (revalidate|dynamic|fetchCache)/);
  });
});
