import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  boundQueryText,
  buildSearchEvent,
  LATENCY_BUCKETS_MS,
  latencyBucket,
  MAX_LOGGED_QUERY_CHARS,
  SEARCH_OUTCOMES,
} from '@/lib/observability/search-event';

/**
 * Credential-shaped fixtures are assembled at runtime rather than written out.
 * A literal here is indistinguishable from a real leak to this repo's own secret
 * scan (and to GitHub's), and both are right to refuse it.
 */
const shaped = {
  postgres: `postgres${'ql'}://user:hunter2@db.example.com/app`,
  openai: `sk${'-'}abcdefghijklmnopqrstuvwxyz123456`,
  github: `ghp${'_'}abcdefghijklmnopqrstuvwxyz0123456789`,
  aws: `AKIA${'IOSFODNN7EXAMPLE'}`,
  slack: `xoxb${'-'}1234567890-abcdefghij`,
};

describe('latencyBucket', () => {
  it('puts a duration in the first bucket that contains it', () => {
    assert.equal(latencyBucket(0), '<=50ms');
    assert.equal(latencyBucket(50), '<=50ms');
    assert.equal(latencyBucket(51), '<=100ms');
    assert.equal(latencyBucket(2500), '<=2500ms');
  });

  it('reports anything past the slowest bound as over it', () => {
    assert.equal(latencyBucket(2501), '>2500ms');
    assert.equal(latencyBucket(60_000), '>2500ms');
  });

  it('never reports a bucket a duration does not belong to', () => {
    for (const bound of LATENCY_BUCKETS_MS) {
      assert.equal(latencyBucket(bound), `<=${bound}ms`);
      assert.notEqual(latencyBucket(bound + 0.5), `<=${bound}ms`);
    }
  });

  it('is explicit about durations it cannot bucket', () => {
    assert.equal(latencyBucket(-1), 'unknown');
    assert.equal(latencyBucket(Number.NaN), 'unknown');
    assert.equal(latencyBucket(Number.POSITIVE_INFINITY), 'unknown');
  });
});

describe('boundQueryText', () => {
  it('trims and keeps a short query whole', () => {
    assert.deepEqual(boundQueryText('  climate fintech  '), {
      query_prefix: 'climate fintech',
      query_chars: 15,
    });
  });

  it('bounds the logged prefix but reports the real length', () => {
    const query = 'a'.repeat(MAX_LOGGED_QUERY_CHARS + 40);
    const bounded = boundQueryText(query);
    assert.equal(bounded.query_prefix.length, MAX_LOGGED_QUERY_CHARS);
    assert.equal(bounded.query_chars, MAX_LOGGED_QUERY_CHARS + 40);
  });

  it('scrubs credential-shaped text a user pasted into the box', () => {
    const pasted = Object.values(shaped);
    for (const secret of pasted) {
      const bounded = boundQueryText(secret);
      assert.equal(bounded.query_prefix, '[redacted]', secret);
    }
  });

  it('handles an empty query', () => {
    assert.deepEqual(boundQueryText('   '), { query_prefix: '', query_chars: 0 });
  });
});

describe('buildSearchEvent', () => {
  it('carries the same keys for every outcome', () => {
    const shapes = SEARCH_OUTCOMES.map((outcome) =>
      Object.keys(buildSearchEvent({ outcome, durationMs: 12 })).sort(),
    );
    for (const shape of shapes) {
      assert.deepEqual(shape, shapes[0], 'event shape drifts between outcomes');
    }
  });

  it('records a successful search with its phase timings', () => {
    assert.deepEqual(
      buildSearchEvent({
        outcome: 'ok',
        durationMs: 180,
        embedMs: 120,
        queryMs: 55,
        resultCount: 7,
        query: 'climate fintech',
      }),
      {
        event: 'search.request',
        outcome: 'ok',
        duration_ms: 180,
        latency_bucket: '<=250ms',
        embed_ms: 120,
        query_ms: 55,
        result_count: 7,
        query_prefix: 'climate fintech',
        query_chars: 15,
      },
    );
  });

  it('zeroes the phases a failed request never reached', () => {
    const event = buildSearchEvent({ outcome: 'invalid_request', durationMs: 1 });
    assert.equal(event.embed_ms, 0);
    assert.equal(event.query_ms, 0);
    assert.equal(event.result_count, 0);
    assert.equal(event.query_prefix, '');
  });
});

describe('search events as published', () => {
  const CREDENTIAL_SHAPES = [
    /postgres(ql)?:\/\//,
    /gh[pousr]_[A-Za-z0-9]{30,}/,
    /sk-[A-Za-z0-9_-]{20,}/,
    /AKIA[0-9A-Z]{16}/,
    /xox[baprs]-/,
  ];

  it('never serializes a vector or an embedding key', () => {
    const serialized = JSON.stringify(
      buildSearchEvent({
        outcome: 'ok',
        durationMs: 90,
        resultCount: 3,
        query: 'vector search for climate',
      }),
    );
    assert.doesNotMatch(serialized, /embedding/);
    assert.doesNotMatch(serialized, /\[-?\d+\.\d+,/);
  });

  it('never serializes credential-shaped text from the query box', () => {
    const pasted = `${shaped.postgres} ${shaped.openai}`;
    const serialized = JSON.stringify(
      buildSearchEvent({ outcome: 'ok', durationMs: 5, query: pasted }),
    );
    for (const shape of CREDENTIAL_SHAPES) {
      assert.doesNotMatch(serialized, shape, shape.source);
    }
  });
});
