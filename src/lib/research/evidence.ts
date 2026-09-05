import { httpUrl } from '../safe-url';
import { freshnessOf, relativeAge, type Freshness } from './freshness';
import type { ResearchFinding, ResearchSourceId } from './types';

/** Closed map: only known ResearchSourceId members become collector badges. */
const SOURCE_LABEL: Record<ResearchSourceId, string> = {
  website: 'Website',
  careers: 'Careers',
};

export type EvidenceItem = {
  field: string;
  label: string;
  value: string;
  source: ResearchSourceId;
  sourceLabel: string;
  href: string | null;
  observed_at: string;
  freshness: Freshness;
  age: string;
};

/** `website_title` reads as "Website title" without a table to keep in sync. */
export function fieldLabel(field: string): string {
  const words = field.replace(/[_-]+/g, ' ').trim();
  return words.length === 0
    ? 'Finding'
    : words[0].toUpperCase() + words.slice(1);
}

/**
 * Findings as a reader sees them: what was found, where it came from, and how
 * old it is. The source link is dropped unless it is http(s), because a stored
 * `javascript:` URL would otherwise become a clickable script.
 *
 * Newest first: the freshest claim is the one worth reading.
 */
export function toEvidenceItems(
  findings: readonly ResearchFinding[],
  now: Date,
): EvidenceItem[] {
  return [...findings]
    .sort((left, right) => {
      if (left.observed_at !== right.observed_at) {
        return left.observed_at < right.observed_at ? 1 : -1;
      }
      return left.field < right.field ? -1 : left.field > right.field ? 1 : 0;
    })
    .map((finding) => ({
      field: finding.field,
      label: fieldLabel(finding.field),
      value: finding.value,
      source: finding.source,
      sourceLabel: SOURCE_LABEL[finding.source],
      href: httpUrl(finding.evidence_url),
      observed_at: finding.observed_at,
      freshness: freshnessOf(finding.observed_at, now),
      age: relativeAge(finding.observed_at, now),
    }));
}
