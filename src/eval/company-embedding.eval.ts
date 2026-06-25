import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertEmbeddingDimensions,
  buildCompanyEmbeddingText,
  DEFAULT_EMBEDDING_BATCH_SIZE,
  EMBEDDING_DIMENSIONS,
  embeddingBatchCount,
} from '@/lib/company-embedding';

describe('EMBEDDING_DIMENSIONS', () => {
  it('is the text-embedding-3-small width expected by pgvector writes', () => {
    assert.equal(EMBEDDING_DIMENSIONS, 1536);
  });
});

describe('buildCompanyEmbeddingText', () => {
  it('includes name and optional prose fields in stable order', () => {
    const text = buildCompanyEmbeddingText({
      name: 'Acme',
      one_liner: 'Widgets for robots',
      long_description: 'Acme builds widgets.',
      industries: ['Hardware'],
      tags: ['B2B', 'robots'],
      regions: ['US'],
      batch: 'Winter 2024',
      stage: 'Seed',
    });

    assert.equal(
      text,
      [
        'Acme',
        'Widgets for robots',
        'Acme builds widgets.',
        'Industries: Hardware',
        'Tags: B2B, robots',
        'Regions: US',
        'Batch: Winter 2024',
        'Stage: Seed',
      ].join('\n'),
    );
  });

  it('omits empty optional fields and blank list entries', () => {
    const text = buildCompanyEmbeddingText({
      name: 'Solo',
      one_liner: '  ',
      long_description: null,
      industries: [],
      tags: ['', '  '],
      regions: null,
      batch: null,
      stage: undefined,
    });
    assert.equal(text, 'Solo');
  });

  it('trims the company name', () => {
    assert.equal(buildCompanyEmbeddingText({ name: '  Trimmed  ' }), 'Trimmed');
  });
});

describe('assertEmbeddingDimensions', () => {
  it('accepts a vector of the configured length and returns a copy', () => {
    const input = Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => i * 0.001);
    const out = assertEmbeddingDimensions(input);
    assert.equal(out.length, EMBEDDING_DIMENSIONS);
    assert.notEqual(out, input);
    assert.equal(out[0], input[0]);
  });

  it('rejects a vector that is too short', () => {
    assert.throws(
      () => assertEmbeddingDimensions([0, 1, 2]),
      /Expected embedding length 1536, got 3/,
    );
  });

  it('rejects a vector that is too long', () => {
    const tooLong = Array.from({ length: EMBEDDING_DIMENSIONS + 1 }, () => 0);
    assert.throws(
      () => assertEmbeddingDimensions(tooLong),
      /Expected embedding length 1536, got 1537/,
    );
  });
});

describe('embeddingBatchCount', () => {
  it('uses the default batch size constant as a positive page size', () => {
    assert.ok(DEFAULT_EMBEDDING_BATCH_SIZE >= 1);
  });

  it('covers totals that divide evenly and with a remainder', () => {
    assert.equal(embeddingBatchCount(0, 32), 0);
    assert.equal(embeddingBatchCount(32, 32), 1);
    assert.equal(embeddingBatchCount(33, 32), 2);
    assert.equal(embeddingBatchCount(100, 32), 4);
  });

  it('rejects invalid batch sizes', () => {
    assert.throws(() => embeddingBatchCount(10, 0), /batchSize/);
    assert.throws(() => embeddingBatchCount(10, -1), /batchSize/);
  });
});
