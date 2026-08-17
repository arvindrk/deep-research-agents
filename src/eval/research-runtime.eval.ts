import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseWebsiteFindings } from '@/lib/research/website';

const OBSERVED_AT = '2026-08-17T10:00:00.000Z';
const URL = 'https://acme.test/';

const page = (head: string): string =>
  `<!doctype html><html><head>${head}</head><body>ignored</body></html>`;

describe('parseWebsiteFindings', () => {
  it('reads the title and the meta description', () => {
    const findings = parseWebsiteFindings(
      page(
        '<title>Acme - rockets for roadrunners</title>' +
          '<meta name="description" content="We build rockets.">',
      ),
      URL,
      OBSERVED_AT,
    );

    assert.deepEqual(
      findings.map((finding) => [finding.field, finding.value]),
      [
        ['website_title', 'Acme - rockets for roadrunners'],
        ['website_description', 'We build rockets.'],
      ],
    );
    for (const finding of findings) {
      assert.equal(finding.source, 'website');
      assert.equal(finding.evidence_url, URL);
      assert.equal(finding.observed_at, OBSERVED_AT);
    }
  });

  it('collapses whitespace and decodes the entities it finds', () => {
    const findings = parseWebsiteFindings(
      page('<title>\n  Acme &amp;\tCo  </title>'),
      URL,
      OBSERVED_AT,
    );
    assert.equal(findings[0].value, 'Acme & Co');
  });

  it('bounds a value that a page made enormous', () => {
    const findings = parseWebsiteFindings(
      page(`<title>${'a'.repeat(1000)}</title>`),
      URL,
      OBSERVED_AT,
    );
    assert.equal(findings[0].value.length, 300);
  });

  it('reports nothing rather than guessing', () => {
    assert.deepEqual(parseWebsiteFindings(page(''), URL, OBSERVED_AT), []);
    assert.deepEqual(parseWebsiteFindings('', URL, OBSERVED_AT), []);
    assert.deepEqual(
      parseWebsiteFindings(page('<title>   </title>'), URL, OBSERVED_AT),
      [],
    );
  });

  it('refuses a page whose URL is not http', () => {
    assert.deepEqual(
      parseWebsiteFindings(
        page('<title>Acme</title>'),
        'javascript:alert(1)',
        OBSERVED_AT,
      ),
      [],
    );
  });
});
