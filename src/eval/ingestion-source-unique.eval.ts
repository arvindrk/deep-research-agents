import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const REPO_ROOT = process.cwd();
const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');

const MIGRATIONS_DIR = join(REPO_ROOT, 'migrations');
const COMPANIES_QUERY = 'src/db/queries/companies.ts';

function sourceUniqueMigration(): { name: string; body: string } {
  const names = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  const match = names.find((name) => {
    const body = readFileSync(join(MIGRATIONS_DIR, name), 'utf8');
    return /CREATE\s+UNIQUE\s+INDEX/i.test(body) && /companies/i.test(body);
  });
  assert.ok(match, 'expected a migration that creates a unique index on companies');
  return { name: match, body: read(`migrations/${match}`) };
}

describe('companies source uniqueness', () => {
  it('migrates a unique index on companies (source, source_id)', () => {
    const { body } = sourceUniqueMigration();
    assert.match(
      body,
      /CREATE\s+UNIQUE\s+INDEX\b[\s\S]*\bON\s+companies\s*\(\s*source\s*,\s*source_id\s*\)/i,
      'migration must create UNIQUE INDEX ON companies (source, source_id)',
    );
    assert.match(
      body,
      /Applied by a human/i,
      'migration must stay human-applied like 0001',
    );
    assert.match(
      body,
      /duplicate/i,
      'migration must warn operators to check for duplicate (source, source_id) rows before apply',
    );
  });

  it('inserts with ON CONFLICT (source, source_id) DO NOTHING and falls back to getCompanyBySource', () => {
    const source = read(COMPANIES_QUERY);
    const insertStart = source.indexOf('export async function insertCompanyFromSource');
    assert.ok(insertStart >= 0, 'insertCompanyFromSource must exist');
    const nextExport = source.indexOf('\nexport async function ', insertStart + 1);
    const insertBody = nextExport === -1 ? source.slice(insertStart) : source.slice(insertStart, nextExport);

    assert.match(
      insertBody,
      /ON\s+CONFLICT\s*\(\s*source\s*,\s*source_id\s*\)\s*DO\s+NOTHING/i,
      'insert must target ON CONFLICT (source, source_id) DO NOTHING',
    );
    assert.match(insertBody, /RETURNING\s+id/i, 'insert must RETURNING id');
    assert.match(
      insertBody,
      /getCompanyBySource\s*\(\s*record\.source\s*,\s*record\.source_id\s*\)/,
      'when ON CONFLICT returns no row, insert must fall back to getCompanyBySource',
    );
    assert.match(
      insertBody,
      /results\.length\s*>\s*0|results\.length\s*===\s*0/,
      'insert must branch on whether RETURNING produced a row',
    );
  });
});
