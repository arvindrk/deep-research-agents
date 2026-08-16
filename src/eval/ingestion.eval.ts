import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  contentChecksum,
  embeddingTextChecksum,
} from '@/lib/ingestion/checksum';
import {
  decideRefresh,
  nextCursor,
  recordsAfterCursor,
  sortBySourceId,
  type StoredCompany,
} from '@/lib/ingestion/refresh-plan';
import {
  parseSourceCompany,
  type CompanyContent,
  type SourceCompanyRecord,
} from '@/lib/ingestion/source-record';

const minimal = {
  source: 'yc',
  source_id: 'acme-1',
  name: 'Acme',
};

const content = (overrides: Partial<CompanyContent> = {}): CompanyContent => ({
  name: 'Acme',
  source_url: 'https://example.com/acme',
  website: 'https://acme.test/',
  logo_url: null,
  one_liner: 'Rockets for roadrunners',
  long_description: null,
  tags: ['ai', 'fintech'],
  industries: ['software'],
  regions: ['americas'],
  batch: 'W21',
  stage: 'seed',
  status: 'active',
  team_size: 12,
  is_hiring: true,
  is_nonprofit: false,
  all_locations: 'San Francisco, CA',
  ...overrides,
});

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

describe('contentChecksum', () => {
  it('is stable across runs for the same content', () => {
    assert.equal(contentChecksum(content()), contentChecksum(content()));
  });

  it('ignores list order and key order', () => {
    assert.equal(
      contentChecksum(content()),
      contentChecksum(content({ tags: ['fintech', 'ai'] })),
    );
  });

  it('changes when any owned field changes', () => {
    const baseline = contentChecksum(content());
    const changes: Partial<CompanyContent>[] = [
      { name: 'Acme Inc' },
      { one_liner: 'Rockets, now for coyotes' },
      { team_size: 13 },
      { is_hiring: false },
      { status: 'acquired' },
      { website: 'https://acme.example/' },
      { tags: ['ai'] },
    ];
    for (const change of changes) {
      assert.notEqual(
        contentChecksum(content(change)),
        baseline,
        JSON.stringify(change),
      );
    }
  });
});

describe('embeddingTextChecksum', () => {
  it('changes when embedded text changes', () => {
    assert.notEqual(
      embeddingTextChecksum(content()),
      embeddingTextChecksum(content({ one_liner: 'Something else entirely' })),
    );
  });

  it('does not change for metadata the embedding never sees', () => {
    const baseline = embeddingTextChecksum(content());
    for (const change of [
      { team_size: 400 },
      { is_hiring: false },
      { website: 'https://acme.example/' },
      { all_locations: 'Berlin, DE' },
      { status: 'acquired' },
    ] as Partial<CompanyContent>[]) {
      assert.equal(
        embeddingTextChecksum(content(change)),
        baseline,
        JSON.stringify(change),
      );
    }
  });
});

describe('decideRefresh', () => {
  const incoming = (overrides: Partial<CompanyContent> = {}): SourceCompanyRecord => ({
    source: 'yc',
    source_id: 'acme-1',
    ...content(overrides),
  });

  const stored = (overrides: Partial<CompanyContent> = {}): StoredCompany => ({
    id: 'company-1',
    ...content(overrides),
  });

  it('inserts and embeds a record it has never seen', () => {
    assert.deepEqual(decideRefresh(null, incoming()), {
      action: 'insert',
      reembed: true,
      reason: 'not ingested yet',
    });
  });

  it('updates and re-embeds when the embedded text changed', () => {
    const decision = decideRefresh(stored(), incoming({ one_liner: 'New pitch' }));
    assert.equal(decision.action, 'update');
    assert.equal(decision.reembed, true);
  });

  it('updates without re-embedding when only metadata changed', () => {
    for (const change of [
      { team_size: 40 },
      { is_hiring: false },
      { all_locations: 'Berlin, DE' },
      { status: 'acquired' },
    ] as Partial<CompanyContent>[]) {
      const decision = decideRefresh(stored(), incoming(change));
      assert.equal(decision.action, 'update', JSON.stringify(change));
      assert.equal(decision.reembed, false, JSON.stringify(change));
    }
  });

  it('only touches an unchanged record, so a re-run writes no content', () => {
    const decision = decideRefresh(stored(), incoming());
    assert.deepEqual(decision, {
      action: 'touch',
      reembed: false,
      reason: 'unchanged',
    });
  });

  it('is idempotent: the same input decides the same way every time', () => {
    const first = decideRefresh(stored(), incoming({ batch: 'S22' }));
    const second = decideRefresh(stored(), incoming({ batch: 'S22' }));
    assert.deepEqual(first, second);
  });
});

describe('resuming a run', () => {
  const page = (...ids: string[]): SourceCompanyRecord[] =>
    ids.map((source_id) => ({ source: 'yc', source_id, ...content() }));

  it('walks records in a stable order whatever the source sent', () => {
    assert.deepEqual(
      sortBySourceId(page('c', 'a', 'b')).map((r) => r.source_id),
      ['a', 'b', 'c'],
    );
  });

  it('starts from the beginning without a cursor', () => {
    assert.equal(recordsAfterCursor(page('a', 'b'), null).length, 2);
  });

  it('excludes the record the cursor names, so it is never done twice', () => {
    assert.deepEqual(
      recordsAfterCursor(page('a', 'b', 'c'), 'a').map((r) => r.source_id),
      ['b', 'c'],
    );
  });

  it('finishes empty when the cursor is past the last record', () => {
    assert.deepEqual(recordsAfterCursor(page('a', 'b'), 'z'), []);
  });

  it('advances the cursor to the last record it finished', () => {
    assert.equal(nextCursor(page('a', 'c', 'b'), null), 'c');
  });

  it('keeps the cursor when a page turns out to be empty', () => {
    assert.equal(nextCursor([], 'a'), 'a');
  });

  it('reaches the same place whether it runs in one pass or two', () => {
    const all = page('a', 'b', 'c', 'd');
    const onePass = recordsAfterCursor(all, null).map((r) => r.source_id);

    const firstHalf = recordsAfterCursor(all, null).slice(0, 2);
    const resumed = recordsAfterCursor(all, nextCursor(firstHalf, null));
    const twoPasses = [
      ...firstHalf.map((r) => r.source_id),
      ...resumed.map((r) => r.source_id),
    ];

    assert.deepEqual(twoPasses, onePass);
  });
});
