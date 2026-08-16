import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseSourceCompany } from '@/lib/ingestion/source-record';

const minimal = {
  source: 'yc',
  source_id: 'acme-1',
  name: 'Acme',
};

describe('parseSourceCompany', () => {
  it('accepts the minimum a source must supply', () => {
    const parsed = parseSourceCompany(minimal);
    assert.equal(parsed.ok, true);
    assert.ok(parsed.ok && parsed.value.source_id === 'acme-1');
  });

  it('rejects a record without an identity or a name', () => {
    for (const raw of [
      {},
      null,
      [],
      'acme',
      { source: 'yc', source_id: 'acme-1' },
      { source: 'yc', name: 'Acme' },
      { source_id: 'acme-1', name: 'Acme' },
      { source: '  ', source_id: 'acme-1', name: 'Acme' },
    ]) {
      assert.equal(parseSourceCompany(raw).ok, false, JSON.stringify(raw));
    }
  });

  it('drops URLs that are not http or https', () => {
    const parsed = parseSourceCompany({
      ...minimal,
      website: 'javascript:alert(1)',
      logo_url: 'data:image/png;base64,AAAA',
      source_url: 'https://example.com/acme',
    });
    assert.ok(parsed.ok);
    assert.equal(parsed.value.website, null);
    assert.equal(parsed.value.logo_url, null);
    assert.equal(parsed.value.source_url, 'https://example.com/acme');
  });

  it('trims, de-duplicates, and drops empty list entries', () => {
    const parsed = parseSourceCompany({
      ...minimal,
      tags: [' ai ', 'ai', '', 'fintech', 42, null],
    });
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value.tags, ['ai', 'fintech']);
  });

  it('refuses to invent a team size or a flag from junk', () => {
    const parsed = parseSourceCompany({
      ...minimal,
      team_size: '12',
      is_hiring: 'yes',
      is_nonprofit: 1,
    });
    assert.ok(parsed.ok);
    assert.equal(parsed.value.team_size, null);
    assert.equal(parsed.value.is_hiring, false);
    assert.equal(parsed.value.is_nonprofit, false);
  });

  it('falls back to a known status rather than an empty one', () => {
    const parsed = parseSourceCompany({ ...minimal, status: '   ' });
    assert.ok(parsed.ok);
    assert.equal(parsed.value.status, 'unknown');
  });
});
