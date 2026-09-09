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
