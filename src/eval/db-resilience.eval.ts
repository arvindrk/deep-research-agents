import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isTransientDatabaseError } from '@/db/resilience';

describe('isTransientDatabaseError', () => {
  it('recognises the failures worth retrying', () => {
    const transient = [
      new Error('fetch failed'),
      new Error('read ECONNRESET'),
      new Error('connect ETIMEDOUT 10.0.0.1:5432'),
      new Error('socket hang up'),
      new Error('Connection terminated unexpectedly'),
      new Error('server closed the connection unexpectedly'),
      new Error('sorry, too many connections already'),
      new Error('the database system is starting up'),
    ];
    for (const error of transient) {
      assert.ok(isTransientDatabaseError(error), error.message);
    }
  });

  it('does not retry a failure that will fail again', () => {
    const permanent = [
      new Error('syntax error at or near "SELCT"'),
      new Error('duplicate key value violates unique constraint "companies_pkey"'),
      new Error('column "embeding" does not exist'),
      new Error('DATABASE_URL environment variable is not set'),
      new Error('permission denied for table companies'),
    ];
    for (const error of permanent) {
      assert.equal(isTransientDatabaseError(error), false, error.message);
    }
  });

  it('handles a thrown value that is not an Error', () => {
    assert.equal(isTransientDatabaseError('fetch failed'), true);
    assert.equal(isTransientDatabaseError(null), false);
    assert.equal(isTransientDatabaseError(undefined), false);
  });
});
