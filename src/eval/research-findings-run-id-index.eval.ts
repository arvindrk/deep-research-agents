import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { leadingColumnIndexes, replayIndexChain } from './support/migrations';

/**
 * Findings are loaded by run id (WHERE run_id = $1, or an OR of two run ids),
 * and Postgres does not index the referencing column of a foreign key on its
 * own, so that lookup needs an index of its own.
 *
 * This used to assert that some migration file creates one. That assertion
 * survives the index being dropped, because the file stays in the repository,
 * so it now asserts the chain: what is standing after the last migration.
 */
describe('findings by run id', () => {
  it('is served by an index the whole chain leaves standing', () => {
    const serving = leadingColumnIndexes('company_research_findings', 'run_id');
    assert.ok(
      serving.length > 0,
      'no surviving index on company_research_findings leads with run_id',
    );
  });

  it('is served by exactly one such index, not two', () => {
    const serving = leadingColumnIndexes('company_research_findings', 'run_id');
    assert.equal(
      serving.length,
      1,
      `${serving.map((index) => index.name).join(', ')} all lead with run_id`,
    );
  });

  it('is served by the claim key, which also makes a claim unique', () => {
    const [serving] = leadingColumnIndexes(
      'company_research_findings',
      'run_id',
    );
    assert.ok(serving);
    assert.deepEqual(serving.columns, ['run_id', 'source', 'field']);
    assert.equal(serving.unique, true);
  });

  it('comes from a migration that stays human-applied', () => {
    const [serving] = leadingColumnIndexes(
      'company_research_findings',
      'run_id',
    );
    assert.ok(serving);
    const sql = readFileSync(
      join(process.cwd(), 'migrations', serving.createdBy),
      'utf8',
    );
    assert.match(sql, /Applied by a human/i);
    assert.match(sql, /agent loop/i);
  });

  it('is not served by an index a later migration dropped', () => {
    const chain = replayIndexChain();
    for (const drop of chain.dropped) {
      assert.ok(
        !chain.indexes.some((index) => index.name === drop.name),
        `${drop.name} was dropped by ${drop.migration} and recreated later`,
      );
    }
  });
});
