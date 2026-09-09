import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { EMBEDDING_DIMENSIONS } from '@/lib/company-embedding';
import {
  EMBEDDING_COVERAGE_BAR,
  embeddingCoverageViolations,
  isUsableEmbedding,
  isUsableEmbeddingLength,
  measureEmbeddingCoverage,
  type EmbeddingCoverageRow,
} from '@/lib/embedding-coverage';

type FixtureFile = {
  companies: EmbeddingCoverageRow[];
};

const fixture = JSON.parse(
  readFileSync(join(process.cwd(), 'src/eval/fixtures/embedding-coverage.json'), 'utf8'),
) as FixtureFile;

describe('isUsableEmbedding', () => {
  it('accepts a vector of EMBEDDING_DIMENSIONS without allocating a full fixture copy', () => {
    const stub = { length: EMBEDDING_DIMENSIONS } as unknown as number[];
    assert.equal(isUsableEmbedding(stub), true);
  });

  it('rejects null, undefined, and wrong lengths', () => {
    assert.equal(isUsableEmbedding(null), false);
    assert.equal(isUsableEmbedding(undefined), false);
    assert.equal(isUsableEmbedding([0, 1, 2]), false);
    assert.equal(isUsableEmbedding([]), false);
  });
});

describe('isUsableEmbeddingLength', () => {
  it('matches the dimension constant used by pgvector writes', () => {
    assert.equal(isUsableEmbeddingLength(EMBEDDING_DIMENSIONS), true);
    assert.equal(isUsableEmbeddingLength(1536), true);
    assert.equal(isUsableEmbeddingLength(null), false);
    assert.equal(isUsableEmbeddingLength(3), false);
    assert.equal(isUsableEmbeddingLength(0), false);
  });
});

describe('measureEmbeddingCoverage', () => {
  it('reports zero coverage on an empty inventory', () => {
    assert.deepEqual(measureEmbeddingCoverage([]), {
      total: 0,
      usable: 0,
      fallbackOnly: 0,
      coverage: 0,
    });
  });

  it('counts null and wrong-length rows as fallback-only', () => {
    const report = measureEmbeddingCoverage([
      { id: 'ok', embeddingLength: EMBEDDING_DIMENSIONS },
      { id: 'null', embeddingLength: null },
      { id: 'short', embeddingLength: 8 },
    ]);
    assert.equal(report.total, 3);
    assert.equal(report.usable, 1);
    assert.equal(report.fallbackOnly, 2);
    assert.equal(report.coverage, 1 / 3);
  });
});

describe('fixture corpus', () => {
  it('includes usable and fallback-only cases (not vacuously 100%)', () => {
    assert.ok(fixture.companies.length >= 2);
    const lengths = fixture.companies.map((c) => c.embeddingLength);
    assert.ok(lengths.some((n) => n === EMBEDDING_DIMENSIONS));
    assert.ok(lengths.some((n) => n === null || (n !== null && n !== EMBEDDING_DIMENSIONS)));
  });

  it('never stores full embedding vectors', () => {
    const raw = readFileSync(
      join(process.cwd(), 'src/eval/fixtures/embedding-coverage.json'),
      'utf8',
    );
    assert.doesNotMatch(raw, /"embedding"\s*:/);
    for (const row of fixture.companies) {
      assert.ok('embeddingLength' in row);
      assert.equal(
        Object.keys(row).sort().join(','),
        'embeddingLength,id',
      );
    }
  });

  it('clears the coverage bar with a known mix', () => {
    const report = measureEmbeddingCoverage(fixture.companies);
    assert.equal(report.total, 5);
    assert.equal(report.usable, 3);
    assert.equal(report.fallbackOnly, 2);
    assert.equal(report.coverage, 0.6);
    assert.equal(EMBEDDING_COVERAGE_BAR.minCoverage, 0.5);
    assert.deepEqual(embeddingCoverageViolations(report), []);
  });
});

describe('embeddingCoverageViolations', () => {
  it('flags coverage below the bar', () => {
    const report = measureEmbeddingCoverage([
      { id: 'a', embeddingLength: null },
      { id: 'b', embeddingLength: null },
    ]);
    const violations = embeddingCoverageViolations(report);
    assert.equal(violations.length, 1);
    assert.match(violations[0]!, /embedding coverage 0\.00 is below 0\.5/);
  });

  it('flags when the bar is raised above the fixture', () => {
    const report = measureEmbeddingCoverage(fixture.companies);
    const violations = embeddingCoverageViolations(report, { minCoverage: 0.99 });
    assert.equal(violations.length, 1);
    assert.match(violations[0]!, /below 0\.99/);
  });
});
