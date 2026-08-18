import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildSearchPath,
  isSearchMode,
  normalizeSearchQuery,
  resolveSearchSurface,
  SEARCH_QUERY_PARAM,
  SEARCH_UI_COPY,
  SEARCH_UI_LIMIT,
} from '@/lib/search-ui';

describe('normalizeSearchQuery', () => {
  it('trims and rejects empty or whitespace-only values', () => {
    assert.equal(normalizeSearchQuery(undefined), '');
    assert.equal(normalizeSearchQuery(null), '');
    assert.equal(normalizeSearchQuery(''), '');
    assert.equal(normalizeSearchQuery('   '), '');
    assert.equal(normalizeSearchQuery('  fintech  '), 'fintech');
  });

  it('uses the first entry when the param is an array', () => {
    assert.equal(normalizeSearchQuery(['ai', 'ml']), 'ai');
    assert.equal(normalizeSearchQuery(['  ']), '');
  });
});

describe('isSearchMode', () => {
  it('is true only for a non-empty normalized query', () => {
    assert.equal(isSearchMode(undefined), false);
    assert.equal(isSearchMode(''), false);
    assert.equal(isSearchMode('  '), false);
    assert.equal(isSearchMode('bots'), true);
  });
});

describe('buildSearchPath', () => {
  it('returns browse home for empty query and encodes q otherwise', () => {
    assert.equal(buildSearchPath(''), '/');
    assert.equal(buildSearchPath('  '), '/');
    assert.equal(buildSearchPath('ai agents'), `/?${SEARCH_QUERY_PARAM}=ai%20agents`);
    assert.equal(buildSearchPath('a&b'), `/?${SEARCH_QUERY_PARAM}=a%26b`);
  });
});

describe('resolveSearchSurface', () => {
  it('maps query and status to browse, results, empty, or error', () => {
    assert.equal(
      resolveSearchSurface({ query: '', status: 'ok', resultCount: 0 }),
      'browse',
    );
    assert.equal(
      resolveSearchSurface({ query: 'x', status: 'error', resultCount: 0 }),
      'error',
    );
    assert.equal(
      resolveSearchSurface({ query: 'x', status: 'ok', resultCount: 0 }),
      'empty',
    );
    assert.equal(
      resolveSearchSurface({ query: 'x', status: 'ok', resultCount: 3 }),
      'results',
    );
  });

  it('prefers error over empty when status is error', () => {
    assert.equal(
      resolveSearchSurface({ query: 'x', status: 'error', resultCount: 5 }),
      'error',
    );
  });
});

describe('SEARCH_UI constants', () => {
  it('locks the query param name and page size', () => {
    assert.equal(SEARCH_QUERY_PARAM, 'q');
    assert.equal(SEARCH_UI_LIMIT, 24);
  });

  it('keeps empty and error copy generic (no driver or provider leaks)', () => {
    const blob = `${SEARCH_UI_COPY.emptyTitle} ${SEARCH_UI_COPY.emptyDescription} ${SEARCH_UI_COPY.errorTitle} ${SEARCH_UI_COPY.errorDescription}`.toLowerCase();
    for (const leak of [
      'openai',
      'neon',
      'postgres',
      'database_url',
      'api_key',
      'connection string',
      'stack',
      'embedding',
    ]) {
      assert.equal(blob.includes(leak), false, `copy must not mention ${leak}`);
    }
  });
});
