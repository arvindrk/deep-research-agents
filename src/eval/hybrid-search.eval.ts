import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HYBRID_SEARCH_WEIGHTS } from '@/db/queries/companies';
import {
  HYBRID_SEARCH_MAX_LIMIT,
  parseHybridSearchInput,
} from '@/lib/hybrid-search-input';
import { toPublicSearchResult } from '@/lib/hybrid-search-result';
import type { SearchResult } from '@/db/types';

describe('HYBRID_SEARCH_WEIGHTS', () => {
  it('locks semantic / name trigram / full-text at 0.7 / 0.2 / 0.1', () => {
    assert.equal(HYBRID_SEARCH_WEIGHTS.semantic, 0.7);
    assert.equal(HYBRID_SEARCH_WEIGHTS.nameTrigram, 0.2);
    assert.equal(HYBRID_SEARCH_WEIGHTS.fullText, 0.1);
  });

  it('sums to 1.0', () => {
    const sum =
      HYBRID_SEARCH_WEIGHTS.semantic +
      HYBRID_SEARCH_WEIGHTS.nameTrigram +
      HYBRID_SEARCH_WEIGHTS.fullText;
    // IEEE floats: 0.7 + 0.2 + 0.1 is not bit-exact 1.
    assert.ok(Math.abs(sum - 1) < 1e-12);
  });
});

describe('parseHybridSearchInput', () => {
  it('accepts a trimmed query and defaults limit to max', () => {
    const parsed = parseHybridSearchInput({ q: '  fintech  ' });
    assert.deepEqual(parsed, {
      ok: true,
      value: { query: 'fintech', limit: HYBRID_SEARCH_MAX_LIMIT },
    });
  });

  it('accepts integer limit within bounds', () => {
    const parsed = parseHybridSearchInput({ q: 'ai', limit: '10' });
    assert.deepEqual(parsed, {
      ok: true,
      value: { query: 'ai', limit: 10 },
    });
  });

  it('rejects empty and whitespace-only queries', () => {
    assert.equal(parseHybridSearchInput({ q: '' }).ok, false);
    assert.equal(parseHybridSearchInput({ q: '   ' }).ok, false);
    assert.equal(parseHybridSearchInput({ q: null }).ok, false);
    assert.equal(parseHybridSearchInput({}).ok, false);
  });

  it('rejects non-integer, out-of-range, and zero limits', () => {
    assert.equal(parseHybridSearchInput({ q: 'x', limit: '1.5' }).ok, false);
    assert.equal(parseHybridSearchInput({ q: 'x', limit: 'abc' }).ok, false);
    assert.equal(parseHybridSearchInput({ q: 'x', limit: '0' }).ok, false);
    assert.equal(parseHybridSearchInput({ q: 'x', limit: '-1' }).ok, false);
    assert.equal(
      parseHybridSearchInput({
        q: 'x',
        limit: String(HYBRID_SEARCH_MAX_LIMIT + 1),
      }).ok,
      false,
    );
  });

  it('accepts limit at the maximum bound', () => {
    const parsed = parseHybridSearchInput({
      q: 'ok',
      limit: String(HYBRID_SEARCH_MAX_LIMIT),
    });
    assert.deepEqual(parsed, {
      ok: true,
      value: { query: 'ok', limit: HYBRID_SEARCH_MAX_LIMIT },
    });
  });
});

describe('toPublicSearchResult', () => {
  it('never includes embedding on the public DTO', () => {
    const row = {
      id: 'c1',
      source: 'yc',
      source_id: '1',
      source_url: null,
      name: 'Acme',
      slug: 'acme',
      website: null,
      logo_url: null,
      one_liner: null,
      long_description: null,
      tags: [],
      industries: [],
      regions: [],
      batch: null,
      team_size: null,
      founded_at: null,
      stage: null,
      status: 'active',
      is_hiring: false,
      is_nonprofit: false,
      all_locations: null,
      source_metadata: {},
      created_at: new Date(0),
      updated_at: new Date(0),
      last_synced_at: new Date(0),
      embedding: [0.1, 0.2, 0.3],
      relevance_score: 0.9,
    } satisfies SearchResult;

    const pub = toPublicSearchResult(row);
    assert.equal('embedding' in pub, false);
    assert.equal(pub.id, 'c1');
    assert.equal(pub.relevance_score, 0.9);
  });
});
