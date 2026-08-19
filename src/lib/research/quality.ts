import type { ResearchRun } from './run';

/** Fields a researched company is expected to have. One per shipped collector. */
export const EXPECTED_FIELDS = ['website_title', 'website_description'] as const;

/**
 * The bar CI holds enrichment to. These are product values: loosening one is a
 * decision about what users are shown, not a test detail.
 */
export const QUALITY_BAR = {
  minFieldCoverage: 0.6,
  maxStaleShare: 0.25,
  maxPartialShare: 0.34,
} as const;

export type QualityBar = {
  readonly minFieldCoverage: number;
  readonly maxStaleShare: number;
  readonly maxPartialShare: number;
};

/**
 * Share of runs that produced each expected field. Coverage is per field rather
 * than an average, because one field at 100% hides another at zero.
 */
export function fieldCoverage(
  runs: readonly ResearchRun[],
  fields: readonly string[] = EXPECTED_FIELDS,
): Record<string, number> {
  const coverage: Record<string, number> = {};

  for (const field of fields) {
    if (runs.length === 0) {
      coverage[field] = 0;
      continue;
    }
    const withField = runs.filter((run) =>
      run.findings.some((finding) => finding.field === field),
    ).length;
    coverage[field] = withField / runs.length;
  }

  return coverage;
}
