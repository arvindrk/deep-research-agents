import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { dedupeFindings } from '@/lib/research/run';
import type { ResearchFinding } from '@/lib/research/types';

import { replayIndexChain } from './support/migrations';

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

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('the run write under the claim key', () => {
  const research = readSource('src/db/queries/research.ts');
  const insertRun = research.slice(
    research.indexOf('export async function insertResearchRun'),
    research.indexOf('export type StoredResearchRun'),
  );

  it('tolerates a conflict on both statements', () => {
    assert.equal((insertRun.match(/ON CONFLICT DO NOTHING/g) ?? []).length, 2);
  });

  it('names no conflict target, so it cannot depend on a migration', () => {
    assert.doesNotMatch(insertRun, /ON CONFLICT\s*\(/);
  });

  it('generates the run id once, outside the retry', () => {
    assert.equal((insertRun.match(/randomUUID\(\)/g) ?? []).length, 1);
    assert.ok(
      insertRun.indexOf('const runId = randomUUID();') <
        insertRun.indexOf('withRetry('),
      'a retry must re-send the same id, not invent a new one',
    );
  });

  it('still writes only deduplicated claims', () => {
    // The database now rejects a repeat; the application must not send one.
    assert.match(
      readSource('src/lib/research/run.ts'),
      /findings: dedupeFindings\(/,
    );
    assert.match(insertRun, /\.\.\.run\.findings\.map\(/);
  });

  it('binds every value it writes', () => {
    assert.doesNotMatch(insertRun, /VALUES[\s\S]*?'\s*\+/);
    assert.doesNotMatch(insertRun, /INSERT INTO \$\{/);
  });

  it('leaves the one upsert that needs a target alone', () => {
    // insertCompanyFromSource upserts on a real key, and the chain eval asserts
    // the unique index that target requires still exists.
    assert.match(
      readSource('src/db/queries/companies.ts'),
      /ON CONFLICT \(source, source_id\)/,
    );
  });
});

const claim = (
  source: ResearchFinding['source'],
  field: string,
  value = 'value',
): ResearchFinding => ({
  source,
  field,
  value,
  evidence_url: 'https://acme.test/',
  observed_at: '2026-09-10T00:00:00.000Z',
  confidence: 'high',
});

describe('the claim identity the application enforces', () => {
  it('is the source and the field, so one source cannot repeat a field', () => {
    const kept = dedupeFindings([
      claim('website', 'website_title'),
      claim('website', 'website_title', 'a different value'),
    ]);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].value, 'value', 'first wins, so the result is order-stable');
  });

  it('keeps the same field reported by two different sources', () => {
    const kept = dedupeFindings([
      claim('website', 'title'),
      claim('careers', 'title'),
    ]);
    assert.equal(kept.length, 2);
  });

  it('ignores the value, the evidence, and the time when deciding', () => {
    const kept = dedupeFindings([
      claim('website', 'website_title'),
      {
        ...claim('website', 'website_title', 'later'),
        evidence_url: 'https://acme.test/about',
        observed_at: '2026-09-11T00:00:00.000Z',
        confidence: 'low',
      },
    ]);
    assert.equal(kept.length, 1);
  });

  it('is built from those two fields and nothing else', () => {
    assert.match(
      readSource('src/lib/research/run.ts'),
      /const findingKey = \(finding: ResearchFinding\): string =>\s*`\$\{finding\.source\}[^`]*\$\{finding\.field\}`;/,
    );
  });

  it('is scoped to one run, which is why run_id leads the index', () => {
    assert.match(
      readSource('src/lib/research/run.ts'),
      /findings: dedupeFindings\(\s*outcomes\.flatMap\(/,
    );
  });

  it('is exactly what the database keys a claim by', () => {
    const keyed = replayIndexChain().indexes.find(
      (index) =>
        index.table === 'company_research_findings' && index.unique,
    );
    assert.ok(keyed, 'no unique index keys a claim');
    assert.deepEqual(keyed.columns, ['run_id', 'source', 'field']);
  });
});
