import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GET } from '@/app/api/companies/[id]/research/route';
import { MAX_COMPANY_ID_CHARS, parseCompanyId } from '@/lib/company-id';

const NUL = String.fromCharCode(0);

describe('parseCompanyId', () => {
  it('accepts the id shapes this database actually holds', () => {
    // Text ids on purpose: the schema says nothing asserts the type of
    // companies.id, so a uuid rule here would reject valid rows.
    for (const id of [
      'company-1',
      'acme',
      '42',
      '8f14e45f-ea0a-4f2b-9d7b-1f2e3d4c5b6a',
      'Y Combinator/W24',
    ]) {
      assert.deepEqual(parseCompanyId(id), { ok: true, value: id }, id);
    }
  });

  it('trims the surrounding whitespace a URL can carry', () => {
    assert.deepEqual(parseCompanyId('  company-1\t'), {
      ok: true,
      value: 'company-1',
    });
  });

  it('refuses an id that is absent in every way it can be absent', () => {
    for (const raw of ['', '   ', '\n', null, undefined, 42, {}, [], true]) {
      assert.deepEqual(
        parseCompanyId(raw),
        { ok: false, error: 'invalid_company_id' },
        JSON.stringify(raw ?? null),
      );
    }
  });

  it('bounds the length, inclusively', () => {
    const atLimit = 'a'.repeat(MAX_COMPANY_ID_CHARS);
    assert.deepEqual(parseCompanyId(atLimit), { ok: true, value: atLimit });
    assert.equal(parseCompanyId(`${atLimit}a`).ok, false);
    assert.equal(MAX_COMPANY_ID_CHARS, 64);
  });

  it('refuses control characters, which no id contains', () => {
    for (const id of [`a${NUL}b`, 'a\nb', 'a\rb', `${NUL}`, 'ab']) {
      assert.equal(parseCompanyId(id).ok, false, JSON.stringify(id));
    }
  });

  it('reports one closed reason, never the value it rejected', () => {
    const result = parseCompanyId('  ');
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'invalid_company_id');
  });
});

/** The route's own signature: a request it ignores, and awaited params. */
const call = (id: string) =>
  GET(new Request('http://research.test/api/companies/x/research'), {
    params: Promise.resolve({ id }),
  });

describe('GET /api/companies/[id]/research, on an id it refuses', () => {
  it('answers 400 with closed copy', async () => {
    const response = await call('   ');
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Invalid company id' });
  });

  it('refuses every unusable id the same way', async () => {
    for (const id of ['', NUL, 'a\nb', 'a'.repeat(MAX_COMPANY_ID_CHARS + 1)]) {
      const response = await call(id);
      assert.equal(response.status, 400, JSON.stringify(id));
    }
  });

  it('never echoes the id it rejected', async () => {
    const response = await call(`${'a'.repeat(MAX_COMPANY_ID_CHARS)}-leaky-id`);
    assert.equal(response.status, 400);
    assert.doesNotMatch(await response.text(), /leaky-id/);
  });
});
