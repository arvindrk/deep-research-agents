import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const MIGRATIONS_DIR = join(process.cwd(), 'migrations');

const migrationNames = (): string[] =>
  readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

const body = (name: string) =>
  readFileSync(join(MIGRATIONS_DIR, name), 'utf8');

const CLAIM_UNIQUE =
  /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+\w+\s*\n?\s*ON\s+company_research_findings\s*\(\s*run_id\s*,\s*source\s*,\s*field\s*\)/i;

function claimMigration(): { name: string; sql: string } {
  const name = migrationNames().find((candidate) =>
    CLAIM_UNIQUE.test(body(candidate)),
  );
  assert.ok(
    name,
    'expected a migration creating a unique index on company_research_findings (run_id, source, field)',
  );
  return { name, sql: body(name) };
}

describe('the claim uniqueness migration', () => {
  const { sql } = claimMigration();

  it('keys a claim by the run and the two fields that identify it', () => {
    assert.match(sql, CLAIM_UNIQUE);
    // company_id would let one run hold the same claim twice under two ids.
    assert.doesNotMatch(
      sql,
      /ON\s+company_research_findings\s*\([^)]*company_id[^)]*\)/i,
    );
  });

  it('stays human-applied, like every migration here', () => {
    assert.match(sql, /Applied by a human/i);
    assert.match(sql, /agent loop/i);
  });

  it('says how to find the duplicates that would block it', () => {
    assert.match(sql, /GROUP BY run_id, source, field HAVING COUNT\(\*\) > 1/i);
    assert.match(sql, /fails if duplicates are present/i);
  });

  it('removes nothing but the index it supersedes', () => {
    assert.match(sql, /DROP INDEX IF EXISTS company_research_findings_run_id_idx/i);
    assert.doesNotMatch(sql, /\bDROP\s+(TABLE|COLUMN|CONSTRAINT)\b/i);
  });

  it('is re-appliable, so a second apply is a no-op', () => {
    const statements = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    for (const create of statements.match(/CREATE\s+[A-Z ]*INDEX[^;]*/gi) ?? []) {
      assert.match(create, /IF\s+NOT\s+EXISTS/i, create);
    }
    for (const drop of statements.match(/DROP\s+INDEX[^;]*/gi) ?? []) {
      assert.match(drop, /IF\s+EXISTS/i, drop);
    }
  });
});

describe('every migration in this repository', () => {
  it('changes schema only, never data', () => {
    const names = migrationNames();
    assert.ok(names.length >= 4, 'the scan must see the migrations it checks');

    for (const name of names) {
      const statements = body(name)
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n');
      assert.doesNotMatch(
        statements,
        /\b(DELETE\s+FROM|UPDATE\s+\w+\s+SET|TRUNCATE)\b/i,
        `${name} mutates data; a human applies these files against real rows`,
      );
    }
  });
});
