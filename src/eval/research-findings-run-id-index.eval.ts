import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const REPO_ROOT = process.cwd();
const MIGRATIONS_DIR = join(REPO_ROOT, 'migrations');

function findingsRunIdIndexMigration(): { name: string; body: string } {
  const names = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  const match = names.find((name) => {
    const body = readFileSync(join(MIGRATIONS_DIR, name), 'utf8');
    return (
      /CREATE\s+INDEX\b/i.test(body) &&
      !/CREATE\s+UNIQUE\s+INDEX\b/i.test(body) &&
      /company_research_findings/i.test(body) &&
      /\brun_id\b/i.test(body)
    );
  });
  assert.ok(
    match,
    'expected a migration that creates a non-unique index on company_research_findings (run_id)',
  );
  return {
    name: match,
    body: readFileSync(join(MIGRATIONS_DIR, match), 'utf8'),
  };
}

describe('company_research_findings run_id index', () => {
  it('migrates a non-unique index on company_research_findings (run_id)', () => {
    const { body } = findingsRunIdIndexMigration();
    assert.match(
      body,
      /CREATE\s+INDEX\b(?!\s+UNIQUE)[\s\S]*\bON\s+company_research_findings\s*\(\s*run_id\s*\)/i,
      'migration must create INDEX ON company_research_findings (run_id)',
    );
    assert.doesNotMatch(
      body,
      /CREATE\s+UNIQUE\s+INDEX/i,
      'findings(run_id) index must not be UNIQUE',
    );
    assert.match(
      body,
      /Applied by a human/i,
      'migration must stay human-applied like 0001/0002',
    );
    assert.match(
      body,
      /agent loop/i,
      'migration must state the agent loop does not apply DDL',
    );
  });
});
