import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ageInDays,
  FRESHNESS_THRESHOLDS_DAYS,
  freshnessOf,
  relativeAge,
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

describe('FRESHNESS_THRESHOLDS_DAYS', () => {
  it('locks the bands users are shown at 7 and 30 days', () => {
    assert.deepEqual(FRESHNESS_THRESHOLDS_DAYS, { fresh: 7, aging: 30 });
  });

  it('keeps the bands ordered and usable', () => {
    assert.ok(FRESHNESS_THRESHOLDS_DAYS.fresh < FRESHNESS_THRESHOLDS_DAYS.aging);
    assert.ok(FRESHNESS_THRESHOLDS_DAYS.fresh >= 1);
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

  it('calls a two week old observation aging and a two month old one stale', () => {
    assert.equal(freshnessOf(daysBefore(14), NOW), 'aging');
    assert.equal(freshnessOf(daysBefore(60), NOW), 'stale');
  });

  it('never calls anything older than the aging threshold fresh', () => {
    for (let days = FRESHNESS_THRESHOLDS_DAYS.aging + 1; days < 120; days += 7) {
      assert.equal(freshnessOf(daysBefore(days), NOW), 'stale', `${days} days`);
    }
  });
});

describe('relativeAge', () => {
  it('names the days a reader counts individually', () => {
    assert.equal(relativeAge(daysBefore(0), NOW), 'today');
    assert.equal(relativeAge(daysBefore(1), NOW), 'yesterday');
    assert.equal(relativeAge(daysBefore(3), NOW), '3 days ago');
  });

  it('gets coarser as the observation gets older', () => {
    assert.equal(relativeAge(daysBefore(7), NOW), '1 week ago');
    assert.equal(relativeAge(daysBefore(21), NOW), '3 weeks ago');
    assert.equal(relativeAge(daysBefore(30), NOW), '1 month ago');
    assert.equal(relativeAge(daysBefore(200), NOW), '6 months ago');
    assert.equal(relativeAge(daysBefore(400), NOW), '1 year ago');
  });

  it('says so when it cannot read the date', () => {
    assert.equal(relativeAge('whenever', NOW), 'date unknown');
  });

  it('never renders a bare number without a unit', () => {
    for (let days = 0; days < 400; days += 1) {
      assert.match(relativeAge(daysBefore(days), NOW), /today|yesterday|ago/);
    }
  });
});
