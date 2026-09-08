import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canonicalEvidenceUrl } from '@/lib/research/canonical';

const FETCHED = 'https://acme.test/index.html?utm_source=x';
const link = (href: string) => `<link rel="canonical" href="${href}">`;

describe('a same-host canonical wins', () => {
  it('replaces the fetched URL, tracking parameters and all', () => {
    assert.equal(
      canonicalEvidenceUrl(link('https://acme.test/'), FETCHED),
      'https://acme.test/',
    );
  });

  it('resolves a root-relative canonical against the fetched URL', () => {
    assert.equal(
      canonicalEvidenceUrl(link('/about'), FETCHED),
      'https://acme.test/about',
    );
  });

  it('resolves dotted relative forms', () => {
    assert.equal(
      canonicalEvidenceUrl(link('./team'), 'https://acme.test/about/index.html'),
      'https://acme.test/about/team',
    );
    assert.equal(
      canonicalEvidenceUrl(link('../careers'), 'https://acme.test/about/index.html'),
      'https://acme.test/careers',
    );
  });

  it('reads rel and href in either attribute order, either quoting', () => {
    assert.equal(
      canonicalEvidenceUrl(
        "<link href='https://acme.test/x' rel='CANONICAL'>",
        FETCHED,
      ),
      'https://acme.test/x',
    );
  });

  it('takes the first usable canonical when a page declares several', () => {
    assert.equal(
      canonicalEvidenceUrl(
        `${link('https://acme.test/first')}${link('https://acme.test/second')}`,
        FETCHED,
      ),
      'https://acme.test/first',
    );
  });
});
