import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildResearchRun, runStatus } from '@/lib/research/run';
import {
  runResearch,
  type ResearchCollector,
} from '@/lib/research/runtime';
import type {
  ResearchFinding,
  ResearchSubject,
  SourceOutcome,
} from '@/lib/research/types';
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

  it('decodes each entity once, so escaped markup stays escaped', () => {
    const findings = parseWebsiteFindings(
      page('<title>Acme &amp;lt;b&amp;gt; Co</title>'),
      URL,
      OBSERVED_AT,
    );
    assert.equal(findings[0].value, 'Acme &lt;b&gt; Co');
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

const finding = (field: string): ResearchFinding => ({
  source: 'website',
  field,
  value: 'value',
  evidence_url: URL,
  observed_at: OBSERVED_AT,
  confidence: 'high',
});

const ok = (findings: ResearchFinding[]): SourceOutcome => ({
  status: 'ok',
  source: 'website',
  findings,
});

const failed = (error: string): SourceOutcome => ({
  status: 'failed',
  source: 'website',
  error,
});

describe('runStatus', () => {
  it('is complete only when every attempted source succeeded', () => {
    assert.equal(runStatus([ok([finding('a')])]), 'complete');
    assert.equal(runStatus([ok([]), ok([finding('a')])]), 'complete');
  });

  it('is partial when some sources failed', () => {
    assert.equal(runStatus([ok([finding('a')]), failed('timeout')]), 'partial');
  });

  it('is failed when every source failed, and when none ran', () => {
    assert.equal(runStatus([failed('timeout'), failed('403')]), 'failed');
    assert.equal(runStatus([]), 'failed');
  });

  it('never calls a run with a failure complete', () => {
    const mixes: SourceOutcome[][] = [
      [failed('x')],
      [ok([]), failed('x')],
      [failed('x'), ok([finding('a')])],
    ];
    for (const outcomes of mixes) {
      assert.notEqual(runStatus(outcomes), 'complete');
    }
  });
});

describe('buildResearchRun', () => {
  it('separates what succeeded from what failed', () => {
    const run = buildResearchRun(
      'company-1',
      [ok([finding('a')]), failed('timeout')],
      OBSERVED_AT,
    );

    assert.equal(run.status, 'partial');
    assert.deepEqual(run.succeeded, ['website']);
    assert.deepEqual(run.failed, [{ source: 'website', error: 'timeout' }]);
    assert.equal(run.findings.length, 1);
    assert.equal(run.observed_at, OBSERVED_AT);
  });

  it('keeps the findings a partial run did gather', () => {
    const run = buildResearchRun(
      'company-1',
      [ok([finding('a'), finding('b')]), failed('timeout')],
      OBSERVED_AT,
    );
    assert.deepEqual(
      run.findings.map((f) => f.field),
      ['a', 'b'],
    );
  });

  it('records an empty run as failed with no findings', () => {
    const run = buildResearchRun('company-1', [], OBSERVED_AT);
    assert.equal(run.status, 'failed');
    assert.deepEqual(run.findings, []);
    assert.deepEqual(run.attempted, []);
  });
});

describe('runResearch', () => {
  const subject: ResearchSubject = {
    id: 'company-1',
    name: 'Acme',
    website: 'https://acme.test/',
  };

  // Collectors in this suite stay on `website` so they exercise failure
  // isolation without depending on how many real sources are registered.
  const collector = (
    field: string,
    behaviour: 'ok' | 'throw' | 'empty',
  ): ResearchCollector => ({
    source: 'website',
    collect: async () => {
      if (behaviour === 'throw') throw new Error(`${field} unreachable`);
      return behaviour === 'empty' ? [] : [finding(field)];
    },
  });

  it('reports a run where every source worked as complete', async () => {
    const run = await runResearch(
      subject,
      [collector('a', 'ok'), collector('b', 'ok')],
      OBSERVED_AT,
    );
    assert.equal(run.status, 'complete');
    assert.equal(run.findings.length, 2);
  });

  it('keeps going when one source throws, and says the run was partial', async () => {
    const run = await runResearch(
      subject,
      [collector('a', 'throw'), collector('b', 'ok')],
      OBSERVED_AT,
    );
    assert.equal(run.status, 'partial');
    assert.deepEqual(
      run.findings.map((f) => f.field),
      ['b'],
    );
    assert.equal(run.failed.length, 1);
    assert.match(run.failed[0].error, /a unreachable/);
  });

  it('reports a run where everything failed as failed, not empty-complete', async () => {
    const run = await runResearch(
      subject,
      [collector('a', 'throw'), collector('b', 'throw')],
      OBSERVED_AT,
    );
    assert.equal(run.status, 'failed');
    assert.deepEqual(run.findings, []);
  });

  it('treats a source with nothing to say as a success', async () => {
    const run = await runResearch(subject, [collector('a', 'empty')], OBSERVED_AT);
    assert.equal(run.status, 'complete');
    assert.deepEqual(run.findings, []);
  });

  it('bounds what a failing source can write into the record', async () => {
    const shouty: ResearchCollector = {
      source: 'website',
      collect: async () => {
        throw new Error('x'.repeat(5000));
      },
    };
    const run = await runResearch(subject, [shouty], OBSERVED_AT);
    assert.equal(run.failed[0].error.length, 200);
  });

  it('does not throw when a source rejects with something that is not an Error', async () => {
    const odd: ResearchCollector = {
      source: 'website',
      collect: async () => {
        throw 'nope';
      },
    };
    const run = await runResearch(subject, [odd], OBSERVED_AT);
    assert.equal(run.status, 'failed');
    assert.equal(run.failed[0].error, 'source failed');
  });
});
