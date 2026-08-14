import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  LATENCY_BUCKETS_MS,
  latencyBucket,
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
