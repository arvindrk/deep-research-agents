import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  leadingColumnIndexes,
  migrationFiles,
  replayIndexChain,
} from './support/migrations';

/**
 * Every lookup the query layer performs with an equality predicate, and the
 * leading column an index must have to serve it. Adding a query means adding a
 * row here, which is the point: the schema and the queries are reviewed
 * together or they drift.
 */
const LOOKUPS = [
  {
    query: 'getRecentResearchRuns (runs for one company, newest first)',
    table: 'company_research_runs',
    leading: 'company_id',
  },
  {
    query: 'getRecentResearchRuns (findings for the runs it selected)',
    table: 'company_research_findings',
    leading: 'run_id',
  },
  {
    query: 'insertCompanyFromSource (ON CONFLICT (source, source_id))',
    table: 'companies',
    leading: 'source',
    unique: true,
  },
] as const;

describe('the migration chain', () => {
  const chain = replayIndexChain();

  it('is understood in full, so nothing is silently skipped', () => {
    assert.deepEqual(
      chain.unparsed.map((statement) => `${statement.migration}: ${statement.raw}`),
      [],
    );
    assert.ok(migrationFiles().length >= 4);
    assert.ok(chain.indexes.length >= 4);
  });

  it('leaves an index for every lookup the queries make', () => {
    for (const lookup of LOOKUPS) {
      const serving = leadingColumnIndexes(lookup.table, lookup.leading);
      assert.ok(
        serving.length > 0,
        `${lookup.query} has no index leading with ${lookup.leading}`,
      );
      if ('unique' in lookup && lookup.unique) {
        assert.ok(
          serving.some((index) => index.unique),
          `${lookup.query} needs a unique index, which is what its ON CONFLICT target requires`,
        );
      }
    }
  });

  it('keeps no index whose key is a prefix of another on the same table', () => {
    for (const index of chain.indexes) {
      const covered = chain.indexes.find(
        (other) =>
          other.name !== index.name &&
          other.table === index.table &&
          other.columns.length > index.columns.length &&
          index.columns.every((column, at) => other.columns[at] === column),
      );
      assert.equal(
        covered,
        undefined,
        `${index.name} is a prefix of ${covered?.name}, so it is written for no read`,
      );
    }
  });

  it('drops the run_id index the claim key supersedes', () => {
    assert.ok(
      chain.dropped.some(
        (drop) => drop.name === 'company_research_findings_run_id_idx',
      ),
      'the superseded index must be dropped by a migration, not just left behind',
    );
    assert.ok(
      !chain.indexes.some(
        (index) => index.name === 'company_research_findings_run_id_idx',
      ),
    );
  });

  it('keys a research claim uniquely, per run and per field', () => {
    const claim = chain.indexes.find(
      (index) =>
        index.table === 'company_research_findings' &&
        index.columns.join(',') === 'run_id,source,field',
    );
    assert.ok(claim, 'no index keys a claim by run, source, and field');
    assert.equal(claim.unique, true);
  });
});
