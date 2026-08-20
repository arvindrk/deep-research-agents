import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fieldLabel, toEvidenceItems } from '@/lib/research/evidence';
import type { ResearchFinding } from '@/lib/research/types';

const NOW = new Date('2026-08-18T12:00:00.000Z');

const finding = (overrides: Partial<ResearchFinding> = {}): ResearchFinding => ({
  source: 'website',
  field: 'website_title',
  value: 'Acme - rockets for roadrunners',
  evidence_url: 'https://acme.test/',
  observed_at: '2026-08-18T09:00:00.000Z',
  confidence: 'high',
  ...overrides,
});

describe('fieldLabel', () => {
  it('reads a field name as a sentence', () => {
    assert.equal(fieldLabel('website_title'), 'Website title');
    assert.equal(fieldLabel('website-description'), 'Website description');
    assert.equal(fieldLabel('headcount'), 'Headcount');
  });

  it('always has something to render', () => {
    assert.equal(fieldLabel(''), 'Finding');
    assert.equal(fieldLabel('___'), 'Finding');
  });
});

describe('toEvidenceItems', () => {
  it('carries the claim, its source, and its age', () => {
    const [item] = toEvidenceItems([finding()], NOW);
    assert.equal(item.label, 'Website title');
    assert.equal(item.value, 'Acme - rockets for roadrunners');
    assert.equal(item.href, 'https://acme.test/');
    assert.equal(item.freshness, 'fresh');
    assert.equal(item.age, 'today');
  });

  it('drops a source link that is not http', () => {
    for (const evidence_url of [
      'javascript:alert(1)',
      'data:text/html,<script>x</script>',
      'file:///etc/passwd',
      '',
      null,
    ]) {
      const [item] = toEvidenceItems([finding({ evidence_url })], NOW);
      assert.equal(item.href, null, String(evidence_url));
      assert.equal(item.value, finding().value, 'the claim itself survives');
    }
  });

  it('puts the freshest finding first', () => {
    const items = toEvidenceItems(
      [
        finding({ field: 'old', observed_at: '2026-06-01T00:00:00.000Z' }),
        finding({ field: 'new', observed_at: '2026-08-17T00:00:00.000Z' }),
      ],
      NOW,
    );
    assert.deepEqual(
      items.map((item) => item.field),
      ['new', 'old'],
    );
  });

  it('orders findings observed together by field, so rendering is stable', () => {
    const items = toEvidenceItems(
      [finding({ field: 'b' }), finding({ field: 'a' })],
      NOW,
    );
    assert.deepEqual(
      items.map((item) => item.field),
      ['a', 'b'],
    );
  });

  it('marks an old finding stale rather than hiding it', () => {
    const [item] = toEvidenceItems(
      [finding({ observed_at: '2026-01-01T00:00:00.000Z' })],
      NOW,
    );
    assert.equal(item.freshness, 'stale');
    assert.equal(item.age, '7 months ago');
  });
});
