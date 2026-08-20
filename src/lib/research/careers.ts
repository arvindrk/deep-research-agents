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

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

/**
 * One pass, so nothing is unescaped twice: replacing `&amp;` first would turn
 * `&amp;lt;` into `<`, which is text the page had deliberately escaped.
 */
const decodeEntities = (value: string): string =>
  value.replace(
    /&(?:amp|lt|gt|quot|#39);/g,
    (entity) => ENTITIES[entity] ?? entity,
  );

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
  const evidence = httpUrl(url);
  if (!evidence) return [];

  const findings: ResearchFinding[] = [];

  const title = TITLE.exec(html)?.[1];
  const cleanTitle = title ? collapse(decodeEntities(title)) : '';
  if (cleanTitle) {
    findings.push({
      source: 'careers',
      field: 'careers_title',
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
      source: 'careers',
      field: 'careers_description',
      value: cleanDescription,
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

  const response = await fetch(url, {
    redirect: 'follow',
    headers: { accept: 'text/html' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Careers request failed with status ${response.status}`);
  }

  return parseCareersFindings(await response.text(), url, observedAt);
}
