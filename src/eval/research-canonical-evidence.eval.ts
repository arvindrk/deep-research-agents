import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canonicalEvidenceUrl } from '@/lib/research/canonical';
import { parseCareersFindings } from '@/lib/research/careers';
import { parseWebsiteFindings } from '@/lib/research/website';

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

describe('anything a reader should not be sent to falls back', () => {
  for (const [label, href] of [
    ['another host', 'https://evil.test/acme'],
    ['a subdomain, which is a different host', 'https://cdn.acme.test/'],
    ['a protocol-relative URL to another host', '//evil.test/acme'],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html,<h1>hi</h1>'],
    ['mailto:', 'mailto:hello@acme.test'],
    ['an unparseable href', 'ht!tp://%%%'],
  ] as const) {
    it(`ignores ${label} and keeps the fetched URL`, () => {
      assert.equal(canonicalEvidenceUrl(link(href), FETCHED), FETCHED);
    });
  }

  it('ignores a link with no href, and a rel that is not canonical', () => {
    assert.equal(canonicalEvidenceUrl('<link rel="canonical">', FETCHED), FETCHED);
    assert.equal(
      canonicalEvidenceUrl('<link rel="stylesheet" href="https://acme.test/a.css">', FETCHED),
      FETCHED,
    );
    assert.equal(
      canonicalEvidenceUrl('<link rel="canonical-ish" href="https://acme.test/x">', FETCHED),
      FETCHED,
    );
  });

  it('skips an unusable canonical in favour of a later usable one', () => {
    assert.equal(
      canonicalEvidenceUrl(
        `${link('https://evil.test/acme')}${link('https://acme.test/real')}`,
        FETCHED,
      ),
      'https://acme.test/real',
    );
  });

  it('keeps the fetched URL when the page declares nothing', () => {
    assert.equal(canonicalEvidenceUrl('<html><head></head></html>', FETCHED), FETCHED);
  });

  it('returns null when the fetched URL itself is unusable', () => {
    assert.equal(canonicalEvidenceUrl(link('https://acme.test/'), 'javascript:alert(1)'), null);
    assert.equal(canonicalEvidenceUrl(link('https://acme.test/'), 'not a url'), null);
  });
});

describe('collector findings carry the canonical URL', () => {
  const OBSERVED_AT = '2026-09-08T12:00:00.000Z';
  const SITE = 'https://acme.test/index.html?ref=hn';
  const CAREERS = 'https://acme.test/careers?ref=hn';
  const page = (canonical: string) =>
    [
      '<html><head>',
      `<link rel="canonical" href="${canonical}">`,
      '<title>Acme</title>',
      '<meta name="description" content="We build things">',
      '</head></html>',
    ].join('');

  it('uses it for every website finding', () => {
    const findings = parseWebsiteFindings(page('https://acme.test/'), SITE, OBSERVED_AT);
    assert.equal(findings.length, 2);
    for (const finding of findings) {
      assert.equal(finding.evidence_url, 'https://acme.test/');
    }
  });

  it('uses it for every careers finding', () => {
    const findings = parseCareersFindings(page('/jobs'), CAREERS, OBSERVED_AT);
    assert.equal(findings.length, 2);
    for (const finding of findings) {
      assert.equal(finding.evidence_url, 'https://acme.test/jobs');
    }
  });

  it('keeps the fetched URL when the canonical points off-host', () => {
    for (const findings of [
      parseWebsiteFindings(page('https://evil.test/acme'), SITE, OBSERVED_AT),
      parseCareersFindings(page('https://evil.test/acme'), CAREERS, OBSERVED_AT),
    ]) {
      assert.ok(findings.length > 0);
      for (const finding of findings) {
        assert.ok(finding.evidence_url?.startsWith('https://acme.test/'));
      }
    }
  });

  it('still produces no findings when the fetched URL is unusable', () => {
    assert.deepEqual(
      parseWebsiteFindings(page('https://acme.test/'), 'javascript:alert(1)', OBSERVED_AT),
      [],
    );
  });
});
