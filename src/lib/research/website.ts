import { httpUrl } from '../safe-url';
import type { ResearchFinding, ResearchSubject } from './types';

/** A source that hangs is a source that failed, so requests carry a bound. */
const FETCH_TIMEOUT_MS = 5_000;

/** Long enough to be useful as evidence, short enough to store and render. */
const MAX_VALUE_CHARS = 300;

const TITLE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const META_DESCRIPTION =
  /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i;

const collapse = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().slice(0, MAX_VALUE_CHARS);

const decodeEntities = (value: string): string =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

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
  const evidence = httpUrl(url);
  if (!evidence) return [];

  const findings: ResearchFinding[] = [];

  const title = TITLE.exec(html)?.[1];
  const cleanTitle = title ? collapse(decodeEntities(title)) : '';
  if (cleanTitle) {
    findings.push({
      source: 'website',
      field: 'website_title',
      value: cleanTitle,
      evidence_url: evidence,
      observed_at: observedAt,
      confidence: 'high',
    });
  }

  const description = META_DESCRIPTION.exec(html)?.[1];
  const cleanDescription = description
    ? collapse(decodeEntities(description))
    : '';
  if (cleanDescription) {
    findings.push({
      source: 'website',
      field: 'website_description',
      value: cleanDescription,
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

  const response = await fetch(url, {
    redirect: 'follow',
    headers: { accept: 'text/html' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Website request failed with status ${response.status}`);
  }

  return parseWebsiteFindings(await response.text(), url, observedAt);
}
