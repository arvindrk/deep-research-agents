import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { parseCareersFindings } from '@/lib/research/careers';
import {
  DESCRIPTION_META_KEYS,
  MAX_FINDING_VALUE_CHARS,
  RESEARCH_FETCH_TIMEOUT_MS,
  collapseValue,
  decodeHtmlEntities,
  headDescription,
  headTitle,
  metaContent,
} from '@/lib/research/html-meta';
import { parseWebsiteFindings } from '@/lib/research/website';

const REPO_ROOT = process.cwd();
const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');

const OBSERVED_AT = '2026-09-06T12:00:00.000Z';
const SITE = 'https://acme.test/';
const CAREERS = 'https://acme.test/careers';

describe('shared collector bounds', () => {
  it('keeps the fetch timeout at 5s and the value cap at 300 characters', () => {
    assert.equal(RESEARCH_FETCH_TIMEOUT_MS, 5_000);
    assert.equal(MAX_FINDING_VALUE_CHARS, 300);
  });
});

describe('decodeHtmlEntities', () => {
  it('decodes the five entities the collectors handle', () => {
    assert.equal(
      decodeHtmlEntities('a&amp;b &lt;c&gt; &quot;d&quot; &#39;e&#39;'),
      `a&b <c> "d" 'e'`,
    );
  });

  it('decodes in one pass, so escaped markup stays escaped', () => {
    assert.equal(decodeHtmlEntities('&amp;lt;script&amp;gt;'), '&lt;script&gt;');
  });

  it('leaves entities it does not know alone', () => {
    assert.equal(decodeHtmlEntities('a &nbsp; b &copy;'), 'a &nbsp; b &copy;');
  });
});

describe('collapseValue', () => {
  it('collapses whitespace and trims', () => {
    assert.equal(collapseValue('  Acme \n\t  Corp  '), 'Acme Corp');
  });

  it('truncates at the shared cap', () => {
    const long = 'x'.repeat(MAX_FINDING_VALUE_CHARS + 50);
    assert.equal(collapseValue(long).length, MAX_FINDING_VALUE_CHARS);
  });
});

describe('headTitle and headDescription', () => {
  it('reads a title across attributes and newlines', () => {
    assert.equal(
      headTitle('<title lang="en">\n  Acme\n  Corp\n</title>'),
      'Acme Corp',
    );
  });

  it('reads a meta description and decodes it', () => {
    assert.equal(
      headDescription(
        '<meta name="description" content="Tools &amp; parts for builders">',
      ),
      'Tools & parts for builders',
    );
  });

  it('returns an empty string when the field is absent', () => {
    assert.equal(headTitle('<html><body>no head</body></html>'), '');
    assert.equal(headDescription('<html><head></head></html>'), '');
  });

  it('bounds both fields at the shared cap', () => {
    const long = 'y'.repeat(MAX_FINDING_VALUE_CHARS + 100);
    assert.equal(headTitle(`<title>${long}</title>`).length, MAX_FINDING_VALUE_CHARS);
    assert.equal(
      headDescription(`<meta name="description" content="${long}">`).length,
      MAX_FINDING_VALUE_CHARS,
    );
  });
});

describe('collector parse output is unchanged by the extraction', () => {
  const html = [
    '<html><head>',
    '<title>  Acme &amp; Co  </title>',
    '<meta name="description" content="We build &lt;things&gt;">',
    '</head></html>',
  ].join('');

  it('still produces website title and description findings', () => {
    assert.deepEqual(parseWebsiteFindings(html, SITE, OBSERVED_AT), [
      {
        source: 'website',
        field: 'website_title',
        value: 'Acme & Co',
        evidence_url: SITE,
        observed_at: OBSERVED_AT,
        confidence: 'high',
      },
      {
        source: 'website',
        field: 'website_description',
        value: 'We build <things>',
        evidence_url: SITE,
        observed_at: OBSERVED_AT,
        confidence: 'medium',
      },
    ]);
  });

  it('still produces careers title and description findings', () => {
    assert.deepEqual(parseCareersFindings(html, CAREERS, OBSERVED_AT), [
      {
        source: 'careers',
        field: 'careers_title',
        value: 'Acme & Co',
        evidence_url: CAREERS,
        observed_at: OBSERVED_AT,
        confidence: 'high',
      },
      {
        source: 'careers',
        field: 'careers_description',
        value: 'We build <things>',
        evidence_url: CAREERS,
        observed_at: OBSERVED_AT,
        confidence: 'medium',
      },
    ]);
  });

  it('still yields nothing for an unusable evidence URL', () => {
    assert.deepEqual(parseWebsiteFindings(html, 'javascript:alert(1)', OBSERVED_AT), []);
    assert.deepEqual(parseCareersFindings(html, 'not a url', OBSERVED_AT), []);
  });
});

describe('collectors no longer carry their own head parser', () => {
  for (const path of [
    'src/lib/research/website.ts',
    'src/lib/research/careers.ts',
  ]) {
    const source = read(path);

    it(`${path} imports the shared module`, () => {
      assert.match(source, /from '\.\/html-meta'/);
      assert.match(source, /headTitle\(html\)/);
      assert.match(source, /headDescription\(html\)/);
      assert.match(source, /AbortSignal\.timeout\(RESEARCH_FETCH_TIMEOUT_MS\)/);
    });

    it(`${path} declares no duplicate of the extracted literals`, () => {
      assert.doesNotMatch(source, /<title\[\^>\]/, 'title regex is duplicated');
      assert.doesNotMatch(source, /name=\\\["'\]description/, 'description regex is duplicated');
      assert.doesNotMatch(source, /const ENTITIES/, 'entity table is duplicated');
      assert.doesNotMatch(source, /const FETCH_TIMEOUT_MS/, 'timeout is duplicated');
      assert.doesNotMatch(source, /const MAX_VALUE_CHARS/, 'value cap is duplicated');
      assert.doesNotMatch(source, /decodeEntities/, 'entity decode is duplicated');
    });
  }
});

describe('description key precedence', () => {
  it('prefers the search-engine description over the link-preview one', () => {
    assert.deepEqual([...DESCRIPTION_META_KEYS], ['description', 'og:description']);
  });

  it('takes name="description" when both are declared', () => {
    assert.equal(
      headDescription(
        '<meta name="description" content="Classic"><meta property="og:description" content="Open Graph">',
      ),
      'Classic',
    );
  });

  it('takes it even when the og tag comes first in the document', () => {
    assert.equal(
      headDescription(
        '<meta property="og:description" content="Open Graph"><meta name="description" content="Classic">',
      ),
      'Classic',
    );
  });

  it('falls back to og:description when no description is declared', () => {
    assert.equal(
      headDescription('<meta property="og:description" content="Open Graph">'),
      'Open Graph',
    );
  });

  it('skips a matching tag with an empty content attribute', () => {
    assert.equal(
      headDescription(
        '<meta name="description" content=""><meta property="og:description" content="Open Graph">',
      ),
      'Open Graph',
    );
  });
});

describe('metaContent reads real-world tag shapes', () => {
  it('does not care which attribute comes first', () => {
    assert.equal(
      metaContent('<meta content="Reversed" property="og:description">', 'og:description'),
      'Reversed',
    );
    assert.equal(
      metaContent('<meta content="Reversed" name="description">', 'description'),
      'Reversed',
    );
  });

  it('accepts single quotes, extra attributes, and spacing', () => {
    assert.equal(
      metaContent(
        "<meta   data-rh='true'  property = 'og:title'   content = 'Acme'  />",
        'og:title',
      ),
      'Acme',
    );
  });

  it('matches the key case-insensitively', () => {
    assert.equal(
      metaContent('<meta PROPERTY="OG:TITLE" CONTENT="Acme">', 'og:title'),
      'Acme',
    );
  });

  it('does not match a different key that shares a prefix', () => {
    assert.equal(
      metaContent('<meta property="og:description:alt" content="No">', 'og:description'),
      '',
    );
  });

  it('returns an empty string when nothing matches', () => {
    assert.equal(metaContent('<html><head></head></html>', 'description'), '');
    assert.equal(metaContent('', 'og:title'), '');
  });

  it('is repeatable, so the global regexes carry no state between calls', () => {
    const html = '<meta property="og:title" content="Acme">';
    assert.equal(metaContent(html, 'og:title'), 'Acme');
    assert.equal(metaContent(html, 'og:title'), 'Acme');
    assert.equal(metaContent(html, 'og:title'), 'Acme');
  });
});

describe('the fallback path keeps the shared bounds', () => {
  it('decodes entities in one pass', () => {
    assert.equal(
      headDescription(
        '<meta property="og:description" content="Tools &amp;lt;things&amp;gt;">',
      ),
      'Tools &lt;things&gt;',
    );
  });

  it('collapses whitespace in og content', () => {
    assert.equal(
      headDescription(
        '<meta property="og:description" content="  We   build\n  things  ">',
      ),
      'We build things',
    );
  });

  it('truncates og content at the shared cap', () => {
    const long = 'z'.repeat(MAX_FINDING_VALUE_CHARS + 100);
    assert.equal(
      headDescription(`<meta property="og:description" content="${long}">`).length,
      MAX_FINDING_VALUE_CHARS,
    );
  });
});

describe('title fallback', () => {
  it('prefers a real <title> over og:title', () => {
    assert.equal(
      headTitle('<title>Classic</title><meta property="og:title" content="Open Graph">'),
      'Classic',
    );
  });

  it('falls back to og:title when there is no title element', () => {
    assert.equal(
      headTitle('<meta property="og:title" content="Open Graph">'),
      'Open Graph',
    );
  });

  it('falls back when the title element is empty or whitespace', () => {
    assert.equal(
      headTitle('<title>   </title><meta property="og:title" content="Open Graph">'),
      'Open Graph',
    );
  });

  it('stays empty when neither is declared', () => {
    assert.equal(headTitle('<html><head></head></html>'), '');
  });
});

describe('an Open Graph-only page now produces findings', () => {
  const ogOnly = [
    '<html><head>',
    '<meta property="og:title" content="Acme &amp; Co">',
    '<meta property="og:description" content="We build things">',
    '</head><body></body></html>',
  ].join('');

  it('yields website title and description findings', () => {
    assert.deepEqual(
      parseWebsiteFindings(ogOnly, SITE, OBSERVED_AT).map((finding) => [
        finding.field,
        finding.value,
        finding.confidence,
      ]),
      [
        ['website_title', 'Acme & Co', 'high'],
        ['website_description', 'We build things', 'medium'],
      ],
    );
  });

  it('yields careers title and description findings', () => {
    assert.deepEqual(
      parseCareersFindings(ogOnly, CAREERS, OBSERVED_AT).map((finding) => [
        finding.field,
        finding.value,
        finding.confidence,
      ]),
      [
        ['careers_title', 'Acme & Co', 'high'],
        ['careers_description', 'We build things', 'medium'],
      ],
    );
  });

  it('kept producing nothing for a page with neither', () => {
    assert.deepEqual(parseWebsiteFindings('<html></html>', SITE, OBSERVED_AT), []);
  });
});
