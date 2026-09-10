import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildResearchRun, dedupeFindings } from '@/lib/research/run';
import type { ResearchFinding, ResearchSourceId, SourceOutcome } from '@/lib/research/types';

const OBSERVED_AT = '2026-09-10T04:00:00.000Z';

const finding = (
  source: ResearchSourceId,
  field: string,
  value: string,
): ResearchFinding => ({
  source,
  field,
  value,
  evidence_url: 'https://acme.test/',
  observed_at: OBSERVED_AT,
  confidence: 'high',
});

describe('a claim is identified by its source and its field', () => {
  it('keeps the same field from two different sources', () => {
    const kept = dedupeFindings([
      finding('website', 'title', 'From the site'),
      finding('careers', 'title', 'From the careers page'),
    ]);
    assert.deepEqual(
      kept.map((f) => [f.source, f.value]),
      [
        ['website', 'From the site'],
        ['careers', 'From the careers page'],
      ],
    );
  });

  it('keeps different fields from the same source', () => {
    const kept = dedupeFindings([
      finding('website', 'website_title', 'Acme'),
      finding('website', 'website_description', 'We build things'),
    ]);
    assert.equal(kept.length, 2);
  });

  it('does not collapse claims that differ only in value', () => {
    const kept = dedupeFindings([
      finding('website', 'website_title', 'First'),
      finding('website', 'website_title', 'Second'),
    ]);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].value, 'First');
  });
});
