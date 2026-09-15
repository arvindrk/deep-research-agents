import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const SECTION = 'src/components/similar-companies.tsx';
const DETAIL = 'src/components/company-detail.tsx';
const PAGE = 'src/app/companies/[id]/page.tsx';

describe('the similar companies section', () => {
  const section = read(SECTION);

  it('ships no client JavaScript', () => {
    assert.doesNotMatch(section, /^\s*['"]use client['"]/m);
    assert.doesNotMatch(section, /\buse(State|Effect|Memo|Ref|Transition)\b/);
    assert.doesNotMatch(section, /\bon(Click|Change|Submit|Input)=/);
  });

  it('reads nothing of its own: the page hands it the answer', () => {
    // A call, not a mention: the prop comment names the query it comes from.
    assert.doesNotMatch(section, /findSimilarCompanies\(|getDBClient\(|await /);
    assert.match(section, /companies: SimilarCompany\[\]/);
    assert.match(section, /loaded: boolean/);
  });

  it('reuses the card and the badge rather than inventing a second one', () => {
    assert.match(section, /import \{ CompanyCard \} from '@\/components\/company-card'/);
    assert.match(section, /<CompanyCard company=\{company\} \/>/);
    assert.match(section, /import \{ Badge \} from '@\/components\/ui\/badge'/);
  });

  it('styles with the design tokens only', () => {
    assert.match(section, /text-\[var\(--color-text-secondary\)\]/);
    assert.doesNotMatch(section, /#[0-9a-fA-F]{3,6}\b/);
    assert.doesNotMatch(section, /style=\{\{/);
  });

  it('is a section with a heading at the level of the page other sections use', () => {
    assert.match(section, /<section className="space-y-3">/);
    assert.match(section, /<h2/);
    assert.doesNotMatch(section, /<h1|<h3/);
    const evidence = read('src/components/company-evidence.tsx');
    assert.match(evidence, /<h2/, 'the research section sets the level this follows');
  });

  it('lists neighbours as a list, keyed by company', () => {
    assert.match(section, /<ul className="grid gap-4 sm:grid-cols-2">/);
    assert.match(section, /<li key=\{company\.id\}/);
  });

  it('says how close in words, never as a number', () => {
    assert.match(section, /\{closenessLabel\(company\.similarity\)\}/);
    assert.doesNotMatch(section, /\{company\.similarity\}/);
    assert.doesNotMatch(section, /toFixed|Math\.round|%/);
  });
});

describe('the section when there is nothing to show', () => {
  const section = read(SECTION);

  it('tells a failed lookup apart from an empty one', () => {
    assert.match(section, /\{!loaded && \(/);
    assert.match(section, /\{loaded && companies\.length === 0 && \(/);
    assert.match(section, /SIMILAR_COMPANIES_FAILED_COPY/);
    assert.match(section, /SIMILAR_COMPANIES_EMPTY_COPY/);
  });

  it('renders the list only when there is one', () => {
    assert.match(section, /\{companies\.length > 0 && \(/);
  });

  it('never renders an error value', () => {
    assert.doesNotMatch(section, /\{error\}|\.error\}/);
  });
});

describe('the page that feeds it', () => {
  const page = read(PAGE);
  const detail = read(DETAIL);

  it('reads all three things at once', () => {
    assert.match(
      page,
      /const \[result, research, similar\] = await Promise\.all\(\[\s*getCompanyById\(id\),\s*getRecentResearchRuns\(id\),\s*findSimilarCompanies\(id\),\s*\]\)/,
    );
    assert.doesNotMatch(page, /await findSimilarCompanies/);
  });

  it('passes the failure through instead of collapsing it', () => {
    assert.match(page, /similarCompanies=\{similar\.success \? similar\.data : \[\]\}/);
    assert.match(page, /similarLoaded=\{similar\.success\}/);
  });

  it('still renders the profile when the lookup fails', () => {
    // The only early return is the company read; a failed neighbour lookup
    // must not reach notFound() or the error state.
    const notFoundAt = page.indexOf('notFound()');
    const similarAt = page.indexOf('similar.success');
    assert.ok(notFoundAt > -1 && similarAt > notFoundAt);
    assert.doesNotMatch(page, /!similar\.success[\s\S]{0,80}notFound/);
  });

  it('renders the section after the research section, once', () => {
    assert.equal((detail.match(/<SimilarCompanies/g) ?? []).length, 1);
    assert.ok(detail.indexOf('<CompanyEvidence') < detail.indexOf('<SimilarCompanies'));
    assert.match(detail, /similarCompanies: SimilarCompany\[\]/);
    assert.match(detail, /similarLoaded: boolean/);
  });
});
