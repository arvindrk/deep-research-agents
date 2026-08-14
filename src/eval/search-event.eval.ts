import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  boundQueryText,
  LATENCY_BUCKETS_MS,
  latencyBucket,
  MAX_LOGGED_QUERY_CHARS,
} from '@/lib/observability/search-event';

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
    const pasted = [
      'postgresql://user:hunter2@db.example.com/app',
      'sk-abcdefghijklmnopqrstuvwxyz123456',
      'ghp_abcdefghijklmnopqrstuvwxyz0123456789',
      'AKIAIOSFODNN7EXAMPLE',
      'xoxb-1234567890-abcdefghij',
    ];
    for (const secret of pasted) {
      const bounded = boundQueryText(secret);
      assert.equal(bounded.query_prefix, '[redacted]', secret);
    }
  });

  it('handles an empty query', () => {
    assert.deepEqual(boundQueryText('   '), { query_prefix: '', query_chars: 0 });
  });
});
