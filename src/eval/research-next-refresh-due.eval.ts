import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { FRESHNESS_THRESHOLDS_DAYS } from '@/lib/research/freshness';
import {
  daysUntilRefresh,
  refreshDueAt,
  refreshDueCopy,
  refreshDueDateTime,
} from '@/lib/research/refresh-due';

const REPO_ROOT = process.cwd();
const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-11T08:00:00.000Z');
const agedDays = (days: number): string =>
  new Date(NOW.getTime() - days * MS_PER_DAY).toISOString();

describe('the due date comes from the shared threshold', () => {
  it('is the observation time plus the fresh threshold', () => {
    const observedAt = '2026-09-01T00:00:00.000Z';
    assert.equal(
      refreshDueAt(observedAt)?.toISOString(),
      new Date(
        new Date(observedAt).getTime() +
          FRESHNESS_THRESHOLDS_DAYS.fresh * MS_PER_DAY,
      ).toISOString(),
    );
  });

  it('exposes it as a machine-readable attribute', () => {
    assert.equal(
      refreshDueDateTime('2026-09-01T00:00:00.000Z'),
      '2026-09-08T00:00:00.000Z',
    );
  });

  it('has no due date for a time it cannot read', () => {
    assert.equal(refreshDueAt('not a date'), null);
    assert.equal(refreshDueAt(''), null);
    assert.equal(refreshDueDateTime('nonsense'), null);
  });
});

describe('the countdown', () => {
  it('is the threshold on the day of observation', () => {
    assert.equal(
      daysUntilRefresh(agedDays(0), NOW),
      FRESHNESS_THRESHOLDS_DAYS.fresh,
    );
  });

  it('reaches zero exactly at the threshold', () => {
    assert.equal(daysUntilRefresh(agedDays(FRESHNESS_THRESHOLDS_DAYS.fresh), NOW), 0);
  });

  it('is one either side of the threshold', () => {
    assert.equal(
      daysUntilRefresh(agedDays(FRESHNESS_THRESHOLDS_DAYS.fresh - 1), NOW),
      1,
    );
    assert.equal(
      daysUntilRefresh(agedDays(FRESHNESS_THRESHOLDS_DAYS.fresh + 1), NOW),
      -1,
    );
  });

  it('rounds a part-day towards the day it is still due', () => {
    const halfPast = new Date(
      NOW.getTime() - (FRESHNESS_THRESHOLDS_DAYS.fresh - 0.5) * MS_PER_DAY,
    ).toISOString();
    assert.equal(daysUntilRefresh(halfPast, NOW), 1);
  });

  it('is null for an unreadable observation time', () => {
    assert.equal(daysUntilRefresh('not a date', NOW), null);
  });
});
