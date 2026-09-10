import { EXPECTED_FIELDS } from './quality';
import type { ResearchFinding } from './types';

/**
 * What one run actually established about a company, measured against the
 * fields the shipped collectors are expected to produce. Counted per run
 * rather than across history: a field found six months ago and gone since is
 * not something that is known now.
 */
export type ResearchCoverage = {
  /** Expected fields this run produced, in expected order. */
  known: string[];
  /** Expected fields it did not. */
  missing: string[];
  /** Fields it produced that nothing expects, in first-seen order. */
  unexpected: string[];
  expected: number;
};

export function researchCoverage(
  findings: readonly ResearchFinding[],
  expected: readonly string[] = EXPECTED_FIELDS,
): ResearchCoverage {
  const present = new Set(findings.map((finding) => finding.field));

  return {
    known: expected.filter((field) => present.has(field)),
    missing: expected.filter((field) => !present.has(field)),
    unexpected: [],
    expected: expected.length,
  };
}
