import { freshnessOf, type Freshness } from './freshness';
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

/** How many findings sit in each freshness band, across every run. */
export function freshnessMix(
  runs: readonly ResearchRun[],
  now: Date,
): Record<Freshness, number> {
  const mix: Record<Freshness, number> = {
    fresh: 0,
    aging: 0,
    stale: 0,
    unknown: 0,
  };

  for (const run of runs) {
    for (const finding of run.findings) {
      mix[freshnessOf(finding.observed_at, now)] += 1;
    }
  }

  return mix;
}

/** Share of runs that lost at least one source. */
export function partialShare(runs: readonly ResearchRun[]): number {
  if (runs.length === 0) return 0;
  const incomplete = runs.filter((run) => run.status !== 'complete').length;
  return incomplete / runs.length;
}

/**
 * Share of runs whose newest finding is already stale. Measured per run rather
 * than per finding: a company with ten stale claims is one stale profile, and it
 * is profiles that users read.
 */
export function staleShare(runs: readonly ResearchRun[], now: Date): number {
  if (runs.length === 0) return 0;

  const stale = runs.filter((run) => {
    if (run.findings.length === 0) return true;
    return run.findings.every(
      (finding) => freshnessOf(finding.observed_at, now) === 'stale',
    );
  }).length;

  return stale / runs.length;
}

export type QualityReport = {
  runs: number;
  findings: number;
  fieldCoverage: Record<string, number>;
  freshness: Record<Freshness, number>;
  partialShare: number;
  staleShare: number;
};

/** One pass over the corpus, so a report is cheap enough to print in CI. */
export function qualityReport(
  runs: readonly ResearchRun[],
  now: Date,
  fields: readonly string[] = EXPECTED_FIELDS,
): QualityReport {
  return {
    runs: runs.length,
    findings: runs.reduce((total, run) => total + run.findings.length, 0),
    fieldCoverage: fieldCoverage(runs, fields),
    freshness: freshnessMix(runs, now),
    partialShare: partialShare(runs),
    staleShare: staleShare(runs, now),
  };
}
