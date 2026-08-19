import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  backoffDelayMs,
  isTransientDatabaseError,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  withRetry,
} from '@/db/resilience';

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

describe('backoffDelayMs', () => {
  it('grows with the attempt until it hits the cap', () => {
    const noJitter = 0;
    assert.equal(backoffDelayMs(1, noJitter), RETRY_BASE_DELAY_MS / 2);
    assert.ok(backoffDelayMs(2, noJitter) > backoffDelayMs(1, noJitter));
    assert.ok(backoffDelayMs(3, noJitter) > backoffDelayMs(2, noJitter));
  });

  it('never exceeds the cap, whatever the attempt or the jitter', () => {
    for (let attempt = 1; attempt <= 20; attempt += 1) {
      for (const jitter of [0, 0.25, 0.5, 0.999]) {
        const delay = backoffDelayMs(attempt, jitter);
        assert.ok(delay <= RETRY_MAX_DELAY_MS, `attempt ${attempt}`);
        assert.ok(delay >= RETRY_BASE_DELAY_MS / 2, `attempt ${attempt}`);
      }
    }
  });

  it('is monotonic in the jitter it is given', () => {
    assert.ok(backoffDelayMs(2, 0.9) > backoffDelayMs(2, 0.1));
  });

  it('rejects an attempt or jitter it cannot schedule', () => {
    assert.throws(() => backoffDelayMs(0, 0));
    assert.throws(() => backoffDelayMs(1.5, 0));
    assert.throws(() => backoffDelayMs(1, 1));
    assert.throws(() => backoffDelayMs(1, -0.1));
  });
});

describe('withRetry', () => {
  const collectSleeps = () => {
    const slept: number[] = [];
    return {
      slept,
      sleep: async (ms: number) => {
        slept.push(ms);
      },
    };
  };

  it('returns the first success without sleeping', async () => {
    const { slept, sleep } = collectSleeps();
    const result = await withRetry(async () => 'ok', { sleep, jitter: () => 0 });
    assert.equal(result, 'ok');
    assert.deepEqual(slept, []);
  });

  it('recovers when a transient failure is followed by a success', async () => {
    const { slept, sleep } = collectSleeps();
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls === 1) throw new Error('fetch failed');
        return calls;
      },
      { sleep, jitter: () => 0 },
    );
    assert.equal(result, 2);
    assert.equal(slept.length, 1);
  });

  it('gives up after the attempt budget and rethrows the last failure', async () => {
    const { slept, sleep } = collectSleeps();
    let calls = 0;
    await assert.rejects(
      withRetry(
        async () => {
          calls += 1;
          throw new Error('connection terminated');
        },
        { attempts: 3, sleep, jitter: () => 0 },
      ),
      /connection terminated/,
    );
    assert.equal(calls, 3, 'attempts include the first try');
    assert.equal(slept.length, 2, 'no sleep after the final attempt');
  });

  it('does not retry a permanent failure', async () => {
    const { slept, sleep } = collectSleeps();
    let calls = 0;
    await assert.rejects(
      withRetry(
        async () => {
          calls += 1;
          throw new Error('syntax error at or near "SELCT"');
        },
        { sleep, jitter: () => 0 },
      ),
      /syntax error/,
    );
    assert.equal(calls, 1);
    assert.deepEqual(slept, []);
  });
});
