import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  companyResearchCacheHeaders,
  COMPANY_RESEARCH_CACHE_CONTROL,
  COMPANY_RESEARCH_OUTCOMES,
  COMPANY_RESEARCH_SHARED_MAX_AGE_SECONDS,
  COMPANY_RESEARCH_STALE_WHILE_REVALIDATE_SECONDS,
  type CompanyResearchOutcome,
} from '@/lib/company-research-cache-policy';
import { NO_STORE, sharedAnswerPolicy } from '@/lib/http-cache-policy';
import {
  SEARCH_CACHE_CONTROL,
  SEARCH_CACHE_SHARED_MAX_AGE_SECONDS,
} from '@/lib/search-cache-policy';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const ROUTE = 'src/app/api/companies/[id]/research/route.ts';

const FAILURES: CompanyResearchOutcome[] = [
  'invalid_company_id',
  'company_not_found',
  'company_read_failed',
];

describe('the company research cache policy', () => {
  it('decides one policy for every outcome the route can reach', () => {
    assert.deepEqual(
      Object.keys(COMPANY_RESEARCH_CACHE_CONTROL).sort(),
      [...COMPANY_RESEARCH_OUTCOMES].sort(),
    );
    assert.equal(COMPANY_RESEARCH_OUTCOMES.length, 4);
  });

  it('lets a shared cache hold the answer for a few minutes', () => {
    assert.equal(
      COMPANY_RESEARCH_CACHE_CONTROL.ok,
      sharedAnswerPolicy(
        COMPANY_RESEARCH_SHARED_MAX_AGE_SECONDS,
        COMPANY_RESEARCH_STALE_WHILE_REVALIDATE_SECONDS,
      ),
    );
    assert.match(COMPANY_RESEARCH_CACHE_CONTROL.ok, /\bmax-age=0\b/);
  });

  it('stores nothing else at all', () => {
    for (const outcome of FAILURES) {
      assert.equal(COMPANY_RESEARCH_CACHE_CONTROL[outcome], NO_STORE, outcome);
    }
  });

  it('reuses an answer for longer than search does, and says why', () => {
    // A research answer changes when a run lands for one company; a search
    // answer changes when anything at all is ingested.
    assert.ok(
      COMPANY_RESEARCH_SHARED_MAX_AGE_SECONDS >
        SEARCH_CACHE_SHARED_MAX_AGE_SECONDS,
    );
    assert.ok(COMPANY_RESEARCH_SHARED_MAX_AGE_SECONDS <= 900);
    assert.ok(
      COMPANY_RESEARCH_STALE_WHILE_REVALIDATE_SECONDS >=
        COMPANY_RESEARCH_SHARED_MAX_AGE_SECONDS,
    );
  });

  it('hands an exit the header, so no exit spells the policy itself', () => {
    for (const outcome of COMPANY_RESEARCH_OUTCOMES) {
      assert.deepEqual(companyResearchCacheHeaders(outcome), {
        'Cache-Control': COMPANY_RESEARCH_CACHE_CONTROL[outcome],
      });
    }
  });
});

describe('the two policies in this repository', () => {
  it('are composed by one helper, so no directive is spelled twice', () => {
    for (const path of [
      'src/lib/search-cache-policy.ts',
      'src/lib/company-research-cache-policy.ts',
    ]) {
      const source = read(path);
      assert.match(source, /sharedAnswerPolicy\(/, path);
      assert.match(source, /from '\.\/http-cache-policy'/, path);
      assert.doesNotMatch(source, /'public, max-age/, path);
    }
  });

  it('differ only in their numbers', () => {
    const shape = (policy: string) => policy.replace(/=\d+/g, '=N');
    assert.equal(
      shape(COMPANY_RESEARCH_CACHE_CONTROL.ok),
      shape(SEARCH_CACHE_CONTROL.ok),
    );
  });

  it('agree that a failure is never stored', () => {
    const stored = [
      ...Object.entries(COMPANY_RESEARCH_CACHE_CONTROL),
      ...Object.entries(SEARCH_CACHE_CONTROL),
    ].filter(([outcome, policy]) => outcome !== 'ok' && policy !== NO_STORE);
    assert.deepEqual(stored, []);
  });
});

describe('every exit the research route takes', () => {
  const route = read(ROUTE);
  const exits = route.match(/return NextResponse\.json\([\s\S]*?\n  \}\);|return NextResponse\.json\([\s\S]*?\n  \);/g) ?? [];

  it('carries the policy for its own outcome', () => {
    for (const outcome of COMPANY_RESEARCH_OUTCOMES) {
      assert.ok(
        route.includes(`companyResearchCacheHeaders('${outcome}')`),
        `${outcome} has no exit carrying its policy`,
      );
    }
    assert.equal(
      (route.match(/companyResearchCacheHeaders\('/g) ?? []).length,
      COMPANY_RESEARCH_OUTCOMES.length,
    );
  });

  it('spells no directive by hand', () => {
    assert.doesNotMatch(route, /'Cache-Control'/);
    assert.doesNotMatch(route, /s-maxage|no-store/);
  });

  it('reads nothing about the reader, so a shared cache is safe', () => {
    assert.doesNotMatch(route, /\bcookies\(\)|\bheaders\(\)/);
    assert.doesNotMatch(route, /authorization|Authorization/);
    assert.doesNotMatch(route, /Set-Cookie|cookies\.set/);
  });

  it('lets the headers be the whole policy', () => {
    assert.doesNotMatch(route, /export const (revalidate|dynamic|fetchCache)/);
    assert.ok(exits.length >= 1);
  });
});
