import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const REPO_ROOT = process.cwd();
const QUERY_FILES = [
  'src/db/queries/companies.ts',
  'src/db/queries/research.ts',
] as const;

const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');

type QueryFunction = { file: string; name: string; body: string };

/** Every exported async function in a query module, with its body. */
function exportedAsyncFunctions(file: string): QueryFunction[] {
  const source = read(file);
  const marker = /export async function (\w+)/g;
  const starts: { name: string; at: number }[] = [];

  for (
    let match = marker.exec(source);
    match !== null;
    match = marker.exec(source)
  ) {
    starts.push({ name: match[1], at: match.index });
  }

  return starts.map((start, index) => ({
    file,
    name: start.name,
    body: source.slice(
      start.at,
      index + 1 < starts.length ? starts[index + 1].at : source.length,
    ),
  }));
}

/** The ones that actually talk to the database. */
const queries = QUERY_FILES.flatMap(exportedAsyncFunctions).filter((fn) =>
  /sql[`.]/.test(fn.body),
);

describe('the query enumeration', () => {
  it('finds every query this repository ships, so the scan cannot pass vacuously', () => {
    assert.deepEqual(
      queries.map((fn) => fn.name).sort(),
      [
        'getAllCompanies',
        'getCompaniesWithOffset',
        'getCompanyById',
        'getCompanyBySource',
        'getCompanyCount',
        'getRecentResearchRuns',
        'insertCompanyFromSource',
        'insertResearchRun',
        'listCompaniesForResearchSchedule',
        'listCompaniesMissingEmbeddings',
        'searchCompanies',
        'touchCompanySyncedAt',
        'updateCompanyEmbedding',
        'updateCompanyFromSource',
      ],
      'a query was added or renamed: the resilience invariant needs to cover it',
    );
  });

  it('read a real body for each one', () => {
    for (const query of queries) {
      assert.ok(query.body.length > 100, `${query.name} body looks empty`);
    }
  });
});

describe('every query retries transient failures', () => {
  for (const query of queries) {
    it(`${query.name} wraps its sql call in withRetry`, () => {
      assert.match(
        query.body,
        /withRetry\s*\(\s*\(\)\s*=>\s*sql[`.]/,
        `${query.name} must wrap the sql tagged template, not the QueryResult mapping`,
      );
    });

    it(`${query.name} awaits no bare sql call`, () => {
      assert.doesNotMatch(
        query.body,
        /await\s+sql[`.]/,
        `${query.name} has an sql call outside withRetry`,
      );
    });
  }
});

/**
 * The one query allowed to return a message it caught, with why. It rethrows
 * its own assertion, not driver text, and the caller needs the dimensions.
 */
const DRIVER_TEXT_EXCEPTIONS: Record<string, string> = {
  updateCompanyEmbedding:
    'returns its own "Expected embedding length" assertion, guarded by startsWith',
};

describe('no query hands driver text to a caller', () => {
  for (const query of queries) {
    it(`${query.name} keeps error.message out of its QueryResult`, () => {
      if (DRIVER_TEXT_EXCEPTIONS[query.name]) {
        assert.match(
          query.body,
          /error\.message\.startsWith\('Expected embedding length'\)/,
          `${query.name} is allowlisted only for its own assertion message`,
        );
        return;
      }

      assert.doesNotMatch(
        query.body,
        /error\.message/,
        `${query.name} must not return or inspect raw driver text`,
      );
    });
  }

  it('gives every allowlisted query a reason', () => {
    for (const [name, reason] of Object.entries(DRIVER_TEXT_EXCEPTIONS)) {
      assert.ok(reason.length > 0, `${name} is allowlisted without a reason`);
      assert.ok(
        queries.some((query) => query.name === name),
        `${name} is allowlisted but is not a query any more`,
      );
    }
  });

  it('closes the single company read that used to leak it', () => {
    const read = queries.find((query) => query.name === 'getCompanyById');
    assert.ok(read);
    assert.match(read.body, /error: 'Failed to read company'/);
    assert.match(read.body, /catch\s*\{/);
  });
});

describe('the two messages callers branch on survive', () => {
  it('getCompanyById still says "Company not found" for an empty result', () => {
    const read = queries.find((query) => query.name === 'getCompanyById');
    assert.ok(read);
    assert.match(
      read.body,
      /results\.length === 0[\s\S]*error: 'Company not found'/,
      'the detail route calls notFound() on exactly this string',
    );
  });

  it('the detail route still branches on it, and renders closed copy otherwise', () => {
    const route = read('src/app/companies/[id]/page.tsx');
    assert.match(route, /result\.error === 'Company not found'/);
    assert.match(route, /notFound\(\)/);
    assert.match(route, /Unable to load company/);
    assert.doesNotMatch(
      route,
      /\{result\.error\}/,
      'the route must never render a query error string',
    );
  });

  it('updateCompanyEmbedding still returns the dimension assertion', () => {
    const write = queries.find((query) => query.name === 'updateCompanyEmbedding');
    assert.ok(write);
    assert.match(write.body, /assertEmbeddingDimensions\(embedding\)/);
    assert.match(write.body, /Expected embedding length/);
    assert.match(write.body, /error: 'Failed to update company embedding'/);
  });
});
