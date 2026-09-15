import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { HYBRID_SEARCH_FILTERS } from '@/lib/hybrid-search-ranking';
import {
  boundSimilarLimit,
  closenessLabel,
  SIMILAR_COMPANIES_EMPTY_COPY,
  SIMILAR_COMPANIES_FAILED_COPY,
  similarityFromDistance,
  SIMILAR_COMPANIES_MIN_SIMILARITY,
  SIMILAR_COMPANIES_DEFAULT_LIMIT,
  SIMILAR_COMPANIES_MAX_LIMIT,
} from '@/lib/similar-companies';

describe('boundSimilarLimit', () => {
  it('passes a sensible request through', () => {
    for (const limit of [1, 3, 6, 12, SIMILAR_COMPANIES_MAX_LIMIT]) {
      assert.equal(boundSimilarLimit(limit), limit);
    }
  });

  it('answers the default when there is no usable limit', () => {
    for (const raw of [undefined, null, '', '   ', 'six', {}, [], true, NaN, Infinity]) {
      assert.equal(
        boundSimilarLimit(raw),
        SIMILAR_COMPANIES_DEFAULT_LIMIT,
        JSON.stringify(raw ?? null),
      );
    }
  });

  it('reads a limit written down, as a URL carries it', () => {
    assert.equal(boundSimilarLimit('8'), 8);
    assert.equal(boundSimilarLimit(' 8 '), 8);
  });

  it('never returns nothing, and never returns everything', () => {
    for (const raw of [0, -1, -1000, 0.4, '0']) {
      assert.equal(boundSimilarLimit(raw), 1, String(raw));
    }
    for (const raw of [25, 1000, '10000', Number.MAX_SAFE_INTEGER]) {
      assert.equal(boundSimilarLimit(raw), SIMILAR_COMPANIES_MAX_LIMIT, String(raw));
    }
  });

  it('returns a whole number a LIMIT can take', () => {
    for (const raw of [1.9, 6.5, 23.999, '7.2']) {
      const bounded = boundSimilarLimit(raw);
      assert.equal(Number.isInteger(bounded), true, String(raw));
      assert.ok(bounded >= 1 && bounded <= SIMILAR_COMPANIES_MAX_LIMIT);
    }
  });

  it('keeps the default inside the bounds it enforces', () => {
    assert.ok(SIMILAR_COMPANIES_DEFAULT_LIMIT >= 1);
    assert.ok(SIMILAR_COMPANIES_DEFAULT_LIMIT <= SIMILAR_COMPANIES_MAX_LIMIT);
  });
});

describe('similarityFromDistance', () => {
  it('turns the ends of the range into the ends of the score', () => {
    assert.equal(similarityFromDistance(0), 1);
    assert.equal(similarityFromDistance(1), 0);
    assert.equal(similarityFromDistance(2), 0);
  });

  it('is the complement of the distance in between', () => {
    for (const distance of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      assert.equal(
        Number(similarityFromDistance(distance).toFixed(10)),
        Number((1 - distance).toFixed(10)),
      );
    }
  });

  it('never leaves the range a reader can be shown', () => {
    for (const distance of [-5, -1, -0.0001, 0, 0.5, 1, 1.0001, 2, 17]) {
      const score = similarityFromDistance(distance);
      assert.ok(score >= 0 && score <= 1, String(distance));
    }
  });

  it('scores an unusable distance as nothing, not as everything', () => {
    for (const distance of [NaN, Infinity, -Infinity]) {
      assert.equal(similarityFromDistance(distance), 0, String(distance));
    }
  });

  it('falls short of the floor for a distance the query would exclude', () => {
    const excluded = 1 - SIMILAR_COMPANIES_MIN_SIMILARITY + 0.01;
    assert.ok(similarityFromDistance(excluded) < SIMILAR_COMPANIES_MIN_SIMILARITY);
    const included = 1 - SIMILAR_COMPANIES_MIN_SIMILARITY - 0.01;
    assert.ok(similarityFromDistance(included) > SIMILAR_COMPANIES_MIN_SIMILARITY);
  });
});

describe('how close counts as related', () => {
  it('is the judgement search already makes, not a second one', () => {
    assert.equal(
      SIMILAR_COMPANIES_MIN_SIMILARITY,
      HYBRID_SEARCH_FILTERS.minSemantic,
      'the floor must be the search floor, so the two surfaces agree',
    );
  });

  it('is read from the search module rather than copied', () => {
    assert.match(
      readFileSync(join(process.cwd(), 'src/lib/similar-companies.ts'), 'utf8'),
      /SIMILAR_COMPANIES_MIN_SIMILARITY = HYBRID_SEARCH_FILTERS\.minSemantic/,
    );
  });
});

const companiesSource = readFileSync(
  join(process.cwd(), 'src/db/queries/companies.ts'),
  'utf8',
);

const functionBody = (name: string): string => {
  const start = companiesSource.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const next = companiesSource.indexOf('\nexport async function ', start + 1);
  return next === -1
    ? companiesSource.slice(start)
    : companiesSource.slice(start, next);
};

describe('the nearest-neighbour query', () => {
  const body = functionBody('findSimilarCompanies');

  it('never answers with the company that was asked about', () => {
    assert.match(body, /WHERE id <> \$\{companyId\}/);
  });

  it('skips a company with no embedding, and a subject with none', () => {
    assert.match(body, /AND embedding IS NOT NULL/);
    assert.match(body, /AND \(SELECT embedding FROM target\) IS NOT NULL/);
  });

  it('applies the shared floor as a parameter', () => {
    assert.match(body, />= \$\{SIMILAR_COMPANIES_MIN_SIMILARITY\}/);
    assert.match(
      body,
      /\(1 - \(embedding <=> \(SELECT embedding FROM target\)\)\)\s*\n?\s*>=/,
    );
  });

  it('orders by the distance the index can serve', () => {
    assert.match(body, /ORDER BY embedding <=> \(SELECT embedding FROM target\)\s*\n/);
    assert.doesNotMatch(body, /ORDER BY similarity/);
    assert.doesNotMatch(body, /ORDER BY[^\n]*DESC/);
  });

  it('takes a bounded limit as a parameter', () => {
    assert.match(body, /LIMIT \$\{bounded\}/);
    assert.match(body, /const bounded = boundSimilarLimit\(limit\);/);
  });

  it('sets the vector search settings search itself uses', () => {
    const search = functionBody('searchCompanies');
    for (const setting of [
      /set_config\('hnsw\.ef_search', \$\{String\(HNSW_EF_SEARCH\)\}, true\)/,
      /set_config\('statement_timeout', \$\{String\(STATEMENT_TIMEOUT_MS\)\}, true\)/,
    ]) {
      assert.match(body, setting);
      assert.match(search, setting);
    }
    assert.match(body, /sql\.transaction\(\[/);
    assert.match(body, /withRetry\(\(\) =>/);
  });

  it('keeps the target vector inside the statement', () => {
    assert.match(body, /WITH target AS MATERIALIZED \(/);
    assert.doesNotMatch(body, /embedding as|embeddingJSON/i);
  });
});

describe('what the nearest-neighbour query hands back', () => {
  const body = functionBody('findSimilarCompanies');
  // The CTE also selects FROM companies, so the projection runs from the
  // statement-level SELECT to the FROM that follows it, not to the first one.
  const selectAt = body.indexOf('SELECT\n');
  const projection = body.slice(selectAt, body.indexOf('FROM companies', selectAt));

  it('selects no embedding column, so no vector crosses the boundary', () => {
    assert.doesNotMatch(projection, /^\s*embedding,?\s*$/m);
    assert.doesNotMatch(projection, /\bembedding\s+AS\b/i);
    assert.match(projection, /AS similarity/);
  });

  it('selects the same columns search does, plus the score', () => {
    const search = functionBody('searchCompanies');
    for (const column of [
      'id, source, source_id, source_url, name, slug, website, logo_url',
      'one_liner, long_description, tags, industries, regions, batch',
      'team_size, founded_at, stage, status, is_hiring, is_nonprofit',
    ]) {
      assert.ok(projection.includes(column), column);
      assert.ok(search.includes(column), `searchCompanies no longer selects ${column}`);
    }
  });

  it('answers a closed reason when the read fails', () => {
    assert.match(body, /error: 'Similar companies lookup failed'/);
    assert.match(body, /catch\s*\{/);
    assert.doesNotMatch(body, /error\.message/);
  });

  it('is reachable through the database barrel, like every other query', () => {
    const barrel = readFileSync(join(process.cwd(), 'src/db/index.ts'), 'utf8');
    assert.match(barrel, /findSimilarCompanies,/);
    assert.match(barrel, /SimilarCompany,/);
  });

  it('is typed as a company plus a score, not a company plus a relevance', () => {
    const types = readFileSync(join(process.cwd(), 'src/db/types.ts'), 'utf8');
    assert.match(types, /export type SimilarCompany = Company & \{\s*similarity: number;\s*\};/);
    assert.match(body, /Promise<QueryResult<SimilarCompany\[\]>>/);
  });
});

describe('closenessLabel', () => {
  it('names the three bands at their boundaries', () => {
    assert.equal(closenessLabel(1), 'Very close');
    assert.equal(closenessLabel(0.8), 'Very close');
    assert.equal(closenessLabel(0.79), 'Close');
    assert.equal(closenessLabel(0.6), 'Close');
    assert.equal(closenessLabel(0.59), 'Related');
  });

  it('still says related for anything the query would return', () => {
    for (const score of [
      SIMILAR_COMPANIES_MIN_SIMILARITY,
      SIMILAR_COMPANIES_MIN_SIMILARITY + 0.01,
      0.3,
      0.5,
    ]) {
      assert.equal(closenessLabel(score), 'Related', String(score));
    }
  });

  it('answers one of three things, whatever it is handed', () => {
    const bands = ['Very close', 'Close', 'Related'];
    for (const score of [-1, 0, 0.25, 0.5, 0.75, 0.999, 1, 2, NaN]) {
      assert.ok(bands.includes(closenessLabel(score)), String(score));
    }
  });

  it('never says a number, a percentage, or a guess', () => {
    for (const score of [0.3, 0.62, 0.85, 1]) {
      const label = closenessLabel(score);
      assert.doesNotMatch(label, /[0-9%]/);
    }
  });
});

describe('the copy for having nothing to show', () => {
  it('tells an empty answer apart from a failed one', () => {
    assert.notEqual(SIMILAR_COMPANIES_EMPTY_COPY, SIMILAR_COMPANIES_FAILED_COPY);
    assert.match(SIMILAR_COMPANIES_EMPTY_COPY, /No similar companies yet/);
    assert.match(SIMILAR_COMPANIES_FAILED_COPY, /could not be loaded/);
  });

  it('carries no URL, no driver text, and no instruction to retry', () => {
    for (const copy of [SIMILAR_COMPANIES_EMPTY_COPY, SIMILAR_COMPANIES_FAILED_COPY]) {
      assert.doesNotMatch(copy, /https?:\/\//);
      assert.doesNotMatch(copy, /postgres|neon|timeout|ECONN/i);
      assert.ok(copy.length < 160, copy);
    }
  });
});

describe('the bands and the query agree', () => {
  const returnable = (): number[] => {
    const scores: number[] = [];
    for (
      let score = SIMILAR_COMPANIES_MIN_SIMILARITY;
      score <= 1.00001;
      score += 0.01
    ) {
      scores.push(Number(score.toFixed(4)));
    }
    return scores;
  };

  it('bands every score the query can return', () => {
    const bands = ['Very close', 'Close', 'Related'];
    const seen = new Set<string>();
    for (const score of returnable()) {
      const label = closenessLabel(score);
      assert.ok(bands.includes(label), `${score} produced ${label}`);
      seen.add(label);
    }
    assert.deepEqual([...seen].sort(), [...bands].sort(), 'every band must be reachable');
  });

  it('never bands a score the query would have excluded', () => {
    // Below the floor the query returns nothing, so no copy is owed for it.
    const excluded = Number((SIMILAR_COMPANIES_MIN_SIMILARITY - 0.01).toFixed(4));
    assert.ok(excluded < SIMILAR_COMPANIES_MIN_SIMILARITY);
    assert.equal(similarityFromDistance(1 - excluded) < SIMILAR_COMPANIES_MIN_SIMILARITY, true);
  });

  it('rises with closeness and never falls', () => {
    const rank = { Related: 0, Close: 1, "Very close": 2 } as const;
    let previous = -1;
    for (const score of returnable()) {
      const current = rank[closenessLabel(score)];
      assert.ok(current >= previous, `band fell at ${score}`);
      previous = current;
    }
    assert.equal(previous, rank["Very close"]);
  });
});
