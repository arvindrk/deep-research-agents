import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ageInDays,
  FRESHNESS_THRESHOLDS_DAYS,
  freshnessOf,
} from '@/lib/research/freshness';

const NOW = new Date('2026-08-18T12:00:00.000Z');
const daysBefore = (days: number): string =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe('ageInDays', () => {
  it('counts whole elapsed days', () => {
    assert.equal(ageInDays(daysBefore(0), NOW), 0);
    assert.equal(ageInDays(daysBefore(1), NOW), 1);
    assert.equal(ageInDays(daysBefore(45), NOW), 45);
  });

  it('rounds a part-day down rather than up', () => {
    assert.equal(ageInDays('2026-08-18T00:00:01.000Z', NOW), 0);
    assert.equal(ageInDays('2026-08-17T11:00:00.000Z', NOW), 1);
  });

  it('treats a future observation as brand new rather than negative', () => {
    assert.equal(ageInDays('2026-09-01T00:00:00.000Z', NOW), 0);
  });

  it('reports an unreadable timestamp as unknown, not as fresh', () => {
    assert.equal(ageInDays('', NOW), null);
    assert.equal(ageInDays('not a date', NOW), null);
  });
});

describe('freshnessOf', () => {
  it('holds the band on each side of every threshold', () => {
    const { fresh, aging } = FRESHNESS_THRESHOLDS_DAYS;
    assert.equal(freshnessOf(daysBefore(0), NOW), 'fresh');
    assert.equal(freshnessOf(daysBefore(fresh), NOW), 'fresh');
    assert.equal(freshnessOf(daysBefore(fresh + 1), NOW), 'aging');
    assert.equal(freshnessOf(daysBefore(aging), NOW), 'aging');
    assert.equal(freshnessOf(daysBefore(aging + 1), NOW), 'stale');
    assert.equal(freshnessOf(daysBefore(365), NOW), 'stale');
  });

  it('reports an unreadable observation as unknown rather than stale', () => {
    assert.equal(freshnessOf('nonsense', NOW), 'unknown');
  });

  it('never calls anything older than the aging threshold fresh', () => {
    for (let days = FRESHNESS_THRESHOLDS_DAYS.aging + 1; days < 120; days += 7) {
      assert.equal(freshnessOf(daysBefore(days), NOW), 'stale', `${days} days`);
    }
  });
});
