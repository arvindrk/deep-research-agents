import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FRESHNESS_THRESHOLDS_DAYS } from '@/lib/research/freshness';
import { selectResearchSchedule } from '@/lib/research/schedule';

const NOW = new Date('2026-08-20T12:00:00.000Z');
const daysBefore = (days: number): string =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe('selectResearchSchedule', () => {
  it('picks missing findings before anything with an observation', () => {
    const result = selectResearchSchedule(
      [
        { company_id: 'fresh-co', newest_finding_at: daysBefore(1) },
        { company_id: 'stale-co', newest_finding_at: daysBefore(60) },
        { company_id: 'missing-co', newest_finding_at: null },
        { company_id: 'aging-co', newest_finding_at: daysBefore(14) },
      ],
      NOW,
      2,
    );

    assert.deepEqual(result.selected, ['missing-co', 'stale-co']);
  });

  it('orders stale companies oldest-first after missing', () => {
    const { aging } = FRESHNESS_THRESHOLDS_DAYS;
    const result = selectResearchSchedule(
      [
        {
          company_id: 'stale-newer',
          newest_finding_at: daysBefore(aging + 10),
        },
        {
          company_id: 'stale-older',
          newest_finding_at: daysBefore(aging + 40),
        },
        { company_id: 'missing-a', newest_finding_at: null },
        { company_id: 'missing-b', newest_finding_at: null },
      ],
      NOW,
      4,
    );

    assert.deepEqual(result.selected, [
      'missing-a',
      'missing-b',
      'stale-older',
      'stale-newer',
    ]);
  });

  it('skips fresh newest findings with an explicit reason', () => {
    const result = selectResearchSchedule(
      [
        { company_id: 'fresh-a', newest_finding_at: daysBefore(0) },
        {
          company_id: 'fresh-b',
          newest_finding_at: daysBefore(FRESHNESS_THRESHOLDS_DAYS.fresh),
        },
        { company_id: 'need-it', newest_finding_at: null },
      ],
      NOW,
      5,
    );

    assert.deepEqual(result.selected, ['need-it']);
    assert.deepEqual(
      result.skipped.filter((skip) => skip.reason === 'fresh').map((s) => s.company_id).sort(),
      ['fresh-a', 'fresh-b'],
    );
  });

  it('never selects more than the concurrency cap and records over_cap skips', () => {
    const companies = Array.from({ length: 8 }, (_, i) => ({
      company_id: `co-${String(i).padStart(2, '0')}`,
      newest_finding_at: null as string | null,
    }));

    const limit = 3;
    const result = selectResearchSchedule(companies, NOW, limit);

    assert.equal(result.selected.length, limit);
    assert.ok(result.selected.length <= limit);
    assert.equal(
      result.skipped.filter((skip) => skip.reason === 'over_cap').length,
      companies.length - limit,
    );
    assert.deepEqual(result.selected, ['co-00', 'co-01', 'co-02']);
  });

  it('treats a zero or negative limit as an empty selection with over_cap skips', () => {
    const result = selectResearchSchedule(
      [
        { company_id: 'a', newest_finding_at: null },
        { company_id: 'b', newest_finding_at: daysBefore(90) },
      ],
      NOW,
      0,
    );

    assert.deepEqual(result.selected, []);
    assert.equal(result.skipped.every((skip) => skip.reason === 'over_cap'), true);
  });
});
