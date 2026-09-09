import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const REPO_ROOT = process.cwd();
const COMPANIES_QUERY = 'src/db/queries/companies.ts';

const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');

function functionBody(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const nextExport = source.indexOf('\nexport async function ', start + 1);
  return nextExport === -1 ? source.slice(start) : source.slice(start, nextExport);
}

const LISTING_FUNCTIONS = [
  'getAllCompanies',
  'getCompaniesWithOffset',
  'getCompanyCount',
] as const;

describe('listing-db-resilience', () => {
  const source = read(COMPANIES_QUERY);

  it('wraps each listing/count sql call with withRetry', () => {
    for (const name of LISTING_FUNCTIONS) {
      const body = functionBody(source, name);
      assert.match(
        body,
        /withRetry\s*\(/,
        `${name} must call withRetry around its sql promise`,
      );
      assert.match(
        body,
        /withRetry\s*\(\s*\(\)\s*=>\s*sql`/,
        `${name} must wrap the sql tagged template, not the QueryResult mapping`,
      );
    }

    const allCompanies = functionBody(source, 'getAllCompanies');
    const withRetryCalls = allCompanies.match(/withRetry\s*\(/g) ?? [];
    assert.ok(
      withRetryCalls.length >= 2,
      'getAllCompanies must wrap both cursor and first-page sql branches',
    );
  });

  it('returns closed generic QueryResult errors without driver text', () => {
    for (const name of LISTING_FUNCTIONS) {
      const body = functionBody(source, name);
      assert.doesNotMatch(
        body,
        /catch\s*\([^)]*\)\s*\{[\s\S]*error\.message/,
        `${name} must not return raw driver error.message`,
      );
      assert.match(
        body,
        /catch\s*\{/,
        `${name} catch must ignore the thrown value`,
      );
    }

    assert.match(
      functionBody(source, 'getAllCompanies'),
      /error:\s*'Failed to list companies'/,
    );
    assert.match(
      functionBody(source, 'getCompaniesWithOffset'),
      /error:\s*'Failed to list companies'/,
    );
    assert.match(
      functionBody(source, 'getCompanyCount'),
      /error:\s*'Failed to count companies'/,
    );
  });
});
