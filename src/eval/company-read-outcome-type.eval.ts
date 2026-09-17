import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  COMPANY_NOT_FOUND,
  COMPANY_READ_FAILED,
} from '@/db/queries/companies';

const REPO_ROOT = process.cwd();
const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');

/** Application source: everything that could read a company, minus the reader. */
function sourceFiles(dir: string): string[] {
  const entries = readdirSync(join(REPO_ROOT, dir), { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      return path === 'src/eval' || path === 'src/db' ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const CONSUMERS = sourceFiles('src').filter((path) =>
  read(path).includes('getCompanyById('),
);

describe('the company read outcome', () => {
  it('is two distinct values, and says which', () => {
    assert.equal(COMPANY_NOT_FOUND, 'Company not found');
    assert.equal(COMPANY_READ_FAILED, 'Failed to read company');
    assert.notEqual(COMPANY_NOT_FOUND, COMPANY_READ_FAILED);
  });

  it('is a union of those two values, not a string', () => {
    const source = read('src/db/queries/companies.ts');
    assert.match(
      source,
      /export type CompanyReadFailure =\s*\|\s*typeof COMPANY_NOT_FOUND\s*\|\s*typeof COMPANY_READ_FAILED;/,
    );
    assert.match(
      source,
      /getCompanyById\([\s\S]*?\): Promise<QueryResult<Company, CompanyReadFailure>>/,
    );
  });

  it('narrows only the query that opted in', () => {
    const types = read('src/db/types.ts');
    assert.match(
      types,
      /export type QueryResult<T, E extends string = string> =\s*\|\s*\{ success: true; data: T \}\s*\|\s*\{ success: false; error: E \};/,
    );
    // The default is what keeps every other query's signature unchanged.
    assert.match(read('src/db/queries/research.ts'), /Promise<QueryResult<StoredResearchRun\[\]>>/);
  });
});

describe('every consumer of that outcome', () => {
  it('is one of the two this repository ships, so the scan cannot pass vacuously', () => {
    assert.deepEqual(CONSUMERS.sort(), [
      'src/app/api/companies/[id]/research/route.ts',
      'src/app/companies/[id]/page.tsx',
    ]);
  });

  it('branches on the named outcome rather than a literal', () => {
    for (const path of CONSUMERS) {
      const source = read(path);
      assert.match(source, /=== COMPANY_NOT_FOUND/, path);
      assert.doesNotMatch(source, /=== 'Company not found'/, path);
      assert.doesNotMatch(source, /=== 'Failed to read company'/, path);
    }
  });

  it('answers something different for each outcome', () => {
    const route = read('src/app/api/companies/[id]/research/route.ts');
    assert.match(route, /COMPANY_NOT_FOUND\)[\s\S]*?status: 404/);
    assert.match(route, /status: 503/);

    const page = read('src/app/companies/[id]/page.tsx');
    assert.match(page, /COMPANY_NOT_FOUND\)[\s\S]*?notFound\(\)/);
    assert.match(page, /Unable to load company/);
  });

  it('never hands the outcome value to a reader', () => {
    for (const path of CONSUMERS) {
      const source = read(path);
      assert.doesNotMatch(source, /\{result\.error\}|\{company\.error\}/, path);
      assert.doesNotMatch(source, /error: (result|company)\.error/, path);
    }
  });
});
