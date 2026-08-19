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
