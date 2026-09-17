import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  COMPANY_NOT_FOUND,
  COMPANY_READ_FAILED,
} from '@/db/queries/companies';

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
        'findSimilarCompanies',
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
    assert.match(read.body, /error: COMPANY_READ_FAILED/);
    assert.match(read.body, /catch\s*\{/);
    assert.equal(COMPANY_READ_FAILED, 'Failed to read company');
  });
});

describe('the two outcomes callers branch on survive', () => {
  it('getCompanyById still answers COMPANY_NOT_FOUND for an empty result', () => {
    const read = queries.find((query) => query.name === 'getCompanyById');
    assert.ok(read);
    assert.match(
      read.body,
      /results\.length === 0[\s\S]*error: COMPANY_NOT_FOUND/,
      'the detail page calls notFound() on exactly this outcome',
    );
    assert.equal(COMPANY_NOT_FOUND, 'Company not found');
    assert.notEqual(
      COMPANY_NOT_FOUND,
      COMPANY_READ_FAILED,
      'a missing row and a failed read must stay tellable apart',
    );
  });

  it('the detail route still branches on it, and renders closed copy otherwise', () => {
    const route = read('src/app/companies/[id]/page.tsx');
    assert.match(route, /result\.error === COMPANY_NOT_FOUND/);
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

describe('retry wrapping did not move the per-transaction settings', () => {
  it('searchCompanies still sets ef_search and the timeout inside its transaction', () => {
    const search = queries.find((query) => query.name === 'searchCompanies');
    assert.ok(search);
    assert.match(
      search.body,
      /withRetry\(\(\)\s*=>\s*\n?\s*sql\.transaction\(\[/,
      'the transaction, not the individual statements, is what gets retried',
    );
    const settings = search.body.indexOf("set_config('hnsw.ef_search'");
    const timeout = search.body.indexOf("set_config('statement_timeout'");
    const select = search.body.indexOf('relevance_score');
    assert.ok(settings > -1 && timeout > -1 && select > -1);
    assert.ok(
      settings < select && timeout < select,
      'both settings must still precede the ranking query in the same transaction',
    );
  });

  it('insertResearchRun still writes the run and its findings in one transaction', () => {
    const insert = queries.find((query) => query.name === 'insertResearchRun');
    assert.ok(insert);
    assert.match(insert.body, /withRetry\(\(\)\s*=>\s*\n?\s*sql\.transaction\(\[/);
    assert.match(insert.body, /INSERT INTO company_research_runs/);
    assert.match(insert.body, /INSERT INTO company_research_findings/);
  });
});

describe('only the db client constructs a connection', () => {
  const CLIENT_MODULE = 'src/db/client.ts';

  function tsFiles(dir: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        found.push(...tsFiles(path));
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        found.push(path);
      }
    }
    return found;
  }

  // Evals are excluded: this file names the driver package in its own
  // assertion, and an eval that matched itself would never go green.
  const sources = [...tsFiles('src'), ...tsFiles('scripts')].filter(
    (file) => !file.startsWith('src/eval/'),
  );

  it('scanned the repository, not an empty list', () => {
    assert.ok(sources.length > 30, `only found ${sources.length} source files`);
  });

  it('imports the driver in exactly one module', () => {
    const importers = sources.filter((file) =>
      read(file).includes('@neondatabase/serverless'),
    );
    assert.deepEqual(
      importers,
      [CLIENT_MODULE],
      'DATABASE_URL resolution and connection reuse live in one place',
    );
  });

  it('resolves the connection string lazily, so the build needs no secret', () => {
    const client = read(CLIENT_MODULE);
    assert.match(client, /export function getDBClient\(\)/);
    assert.match(client, /if \(!client\)/);
    assert.match(client, /process\.env\.DATABASE_URL/);
    assert.doesNotMatch(
      client,
      /process\.env\.DATABASE_URL\s*\?\?|process\.env\.DATABASE_URL\s*\|\|/,
      'never fall back to a default connection string',
    );
  });
});
