import { httpUrl } from '../safe-url';
import { canonicalEvidenceUrl } from './canonical';
import { assertHtmlResponse } from './content-type';
import { readBoundedResponseText } from './fetch-body';
import {
  RESEARCH_FETCH_TIMEOUT_MS,
  headDescription,
  headTitle,
} from './html-meta';
import { fetchResearchResponse } from './public-destination';
import type { ResearchFinding, ResearchSubject } from './types';

/**
 * Careers live under the company site. Derive `/careers` from the website
 * origin so we never invent a host, and refuse anything that is not http(s).
 */
export function careersPageUrl(website: string | null): string | null {
  const base = httpUrl(website);
  if (!base) return null;
  return new URL('/careers', base).href;
}

/**
 * Pure extraction from a fetched careers page. Regex rather than a parser:
 * two fields from a head section is not worth a dependency.
 */
export function parseCareersFindings(
  html: string,
  url: string,
  observedAt: string,
): ResearchFinding[] {
  const evidence = canonicalEvidenceUrl(html, url);
  if (!evidence) return [];

  const findings: ResearchFinding[] = [];

  const title = headTitle(html);
  if (title) {
    findings.push({
      source: 'careers',
      field: 'careers_title',
      value: title,
      evidence_url: evidence,
      observed_at: observedAt,
      confidence: 'high',
    });
  }

  const description = headDescription(html);
  if (description) {
    findings.push({
      source: 'careers',
      field: 'careers_description',
      value: description,
      evidence_url: evidence,
      observed_at: observedAt,
      confidence: 'medium',
    });
  }

  return findings;
}

/**
 * The only I/O in this module. No usable website means no careers URL to
 * fetch: nothing to read is not a failure to read. A non-ok response does
 * fail the source so a successful website alone makes the run partial.
 */
export async function collectCareersFindings(
  subject: ResearchSubject,
  observedAt: string,
): Promise<ResearchFinding[]> {
  const url = careersPageUrl(subject.website);
  if (!url) return [];

  const response = await fetchResearchResponse(url, {
    headers: { accept: 'text/html' },
    signal: AbortSignal.timeout(RESEARCH_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Careers request failed with status ${response.status}`);
  }

  assertHtmlResponse(response);

  return parseCareersFindings(
    await readBoundedResponseText(response),
    url,
    observedAt,
  );
}
