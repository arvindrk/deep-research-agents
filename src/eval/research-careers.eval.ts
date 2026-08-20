import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  careersPageUrl,
  collectCareersFindings,
  parseCareersFindings,
} from '@/lib/research/careers';
import {
  DEFAULT_COLLECTORS,
  runResearch,
  type ResearchCollector,
} from '@/lib/research/runtime';
import { RESEARCH_SOURCES } from '@/lib/research/types';
import type { ResearchFinding, ResearchSubject } from '@/lib/research/types';

const OBSERVED_AT = '2026-08-20T12:00:00.000Z';
const SITE = 'https://acme.test/';
const CAREERS = 'https://acme.test/careers';

const page = (head: string): string =>
  `<!doctype html><html><head>${head}</head><body>ignored</body></html>`;

describe('careersPageUrl', () => {
  it('derives /careers from an http website', () => {
    assert.equal(careersPageUrl('https://acme.test'), 'https://acme.test/careers');
    assert.equal(careersPageUrl('https://acme.test/about'), 'https://acme.test/careers');
  });

  it('returns null when there is no usable website', () => {
    assert.equal(careersPageUrl(null), null);
    assert.equal(careersPageUrl(''), null);
    assert.equal(careersPageUrl('javascript:alert(1)'), null);
    assert.equal(careersPageUrl('data:text/html,hi'), null);
  });
});

describe('parseCareersFindings', () => {
  it('reads the title and the meta description', () => {
    const findings = parseCareersFindings(
      page(
        '<title>Careers at Acme</title>' +
          '<meta name="description" content="Join the rocket team.">',
      ),
      CAREERS,
      OBSERVED_AT,
    );

    assert.deepEqual(
      findings.map((finding) => [finding.field, finding.value]),
      [
        ['careers_title', 'Careers at Acme'],
        ['careers_description', 'Join the rocket team.'],
      ],
    );
    for (const finding of findings) {
      assert.equal(finding.source, 'careers');
      assert.equal(finding.evidence_url, CAREERS);
      assert.equal(finding.observed_at, OBSERVED_AT);
    }
  });

  it('collapses whitespace and decodes entities once', () => {
    const findings = parseCareersFindings(
      page('<title>\n  Jobs &amp;\tCo  </title>'),
      CAREERS,
      OBSERVED_AT,
    );
    assert.equal(findings[0].value, 'Jobs & Co');
  });

  it('bounds a value that a page made enormous', () => {
    const findings = parseCareersFindings(
      page(`<title>${'a'.repeat(1000)}</title>`),
      CAREERS,
      OBSERVED_AT,
    );
    assert.equal(findings[0].value.length, 300);
  });

  it('reports nothing rather than guessing', () => {
    assert.deepEqual(parseCareersFindings(page(''), CAREERS, OBSERVED_AT), []);
    assert.deepEqual(parseCareersFindings('', CAREERS, OBSERVED_AT), []);
    assert.deepEqual(
      parseCareersFindings(page('<title>   </title>'), CAREERS, OBSERVED_AT),
      [],
    );
  });

  it('refuses a page whose URL is not http', () => {
    assert.deepEqual(
      parseCareersFindings(
        page('<title>Careers</title>'),
        'javascript:alert(1)',
        OBSERVED_AT,
      ),
      [],
    );
  });
});

describe('collectCareersFindings', () => {
  it('yields nothing when the subject has no http website', async () => {
    const empty: ResearchSubject = {
      id: 'company-1',
      name: 'Acme',
      website: null,
    };
    assert.deepEqual(await collectCareersFindings(empty, OBSERVED_AT), []);

    const unsafe: ResearchSubject = {
      id: 'company-1',
      name: 'Acme',
      website: 'javascript:alert(1)',
    };
    assert.deepEqual(await collectCareersFindings(unsafe, OBSERVED_AT), []);
  });
});

describe('multi-source research run', () => {
  const subject: ResearchSubject = {
    id: 'company-1',
    name: 'Acme',
    website: SITE,
  };

  const websiteFinding = (): ResearchFinding => ({
    source: 'website',
    field: 'website_title',
    value: 'Acme',
    evidence_url: SITE,
    observed_at: OBSERVED_AT,
    confidence: 'high',
  });

  it('declares website and careers as the known sources', () => {
    assert.deepEqual([...RESEARCH_SOURCES], ['website', 'careers']);
    assert.deepEqual(
      DEFAULT_COLLECTORS.map((collector) => collector.source),
      ['website', 'careers'],
    );
  });

  it('is partial when careers fails and website succeeds', async () => {
    const collectors: ResearchCollector[] = [
      {
        source: 'website',
        collect: async () => [websiteFinding()],
      },
      {
        source: 'careers',
        collect: async () => {
          throw new Error('Careers request failed with status 404');
        },
      },
    ];

    const run = await runResearch(subject, collectors, OBSERVED_AT);

    assert.equal(run.status, 'partial');
    assert.deepEqual(run.succeeded, ['website']);
    assert.deepEqual(run.failed, [
      { source: 'careers', error: 'Careers request failed with status 404' },
    ]);
    assert.deepEqual(
      run.findings.map((finding) => finding.field),
      ['website_title'],
    );
  });

  it('is partial when website fails and careers succeeds', async () => {
    const collectors: ResearchCollector[] = [
      {
        source: 'website',
        collect: async () => {
          throw new Error('Website request failed with status 403');
        },
      },
      {
        source: 'careers',
        collect: async () => [
          {
            source: 'careers',
            field: 'careers_title',
            value: 'Careers at Acme',
            evidence_url: CAREERS,
            observed_at: OBSERVED_AT,
            confidence: 'high',
          },
        ],
      },
    ];

    const run = await runResearch(subject, collectors, OBSERVED_AT);

    assert.equal(run.status, 'partial');
    assert.deepEqual(run.succeeded, ['careers']);
    assert.equal(run.failed[0].source, 'website');
  });
});
