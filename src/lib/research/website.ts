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
 * Pure extraction from a fetched page. Regex rather than a parser: two fields
 * from a head section is not worth a dependency, and anything it cannot find is
 * simply not a finding.
 */
export function parseWebsiteFindings(
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
      source: 'website',
      field: 'website_title',
      value: title,
      evidence_url: evidence,
      observed_at: observedAt,
      confidence: 'high',
    });
  }

  const description = headDescription(html);
  if (description) {
    findings.push({
      source: 'website',
      field: 'website_description',
      value: description,
      evidence_url: evidence,
      observed_at: observedAt,
      confidence: 'medium',
    });
  }

  return findings;
}

/**
 * The only I/O in this module. A company with no usable website yields no
 * findings rather than an error: nothing to read is not a failure to read.
 */
export async function collectWebsiteFindings(
  subject: ResearchSubject,
  observedAt: string,
): Promise<ResearchFinding[]> {
  const url = httpUrl(subject.website);
  if (!url) return [];

  const response = await fetchResearchResponse(url, {
    headers: { accept: 'text/html' },
    signal: AbortSignal.timeout(RESEARCH_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Website request failed with status ${response.status}`);
  }

  assertHtmlResponse(response);

  return parseWebsiteFindings(
    await readBoundedResponseText(response),
    url,
    observedAt,
  );
}
