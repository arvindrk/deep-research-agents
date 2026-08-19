import type { EnrichmentStep, ResearchContext } from './types';

/** Local snapshot of company fields already in the database. Always succeeds. */
export const companySnapshotStep: EnrichmentStep = {
  id: 'company-snapshot',
  required: true,
  enrich: async (ctx: ResearchContext) => ({
    ok: true,
    data: {
      name: ctx.name,
      oneLiner: ctx.oneLiner,
      website: ctx.website,
      tags: [...ctx.tags],
      industries: [...ctx.industries],
      regions: [...ctx.regions],
    },
  }),
};

/**
 * Normalize tags and industries for downstream research.
 * Fails when the company has neither tags nor industries to normalize.
 */
export const taxonomyNormalizeStep: EnrichmentStep = {
  id: 'taxonomy-normalize',
  required: true,
  enrich: async (ctx: ResearchContext) => {
    const tags = ctx.tags
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);
    const industries = ctx.industries
      .map((industry) => industry.trim().toLowerCase())
      .filter((industry) => industry.length > 0);

    if (tags.length === 0 && industries.length === 0) {
      return {
        ok: false,
        error: 'No tags or industries to normalize',
      };
    }

    return {
      ok: true,
      data: {
        tags: [...new Set(tags)],
        industries: [...new Set(industries)],
      },
    };
  },
};

/** Default required enrichment steps used by the local research script. */
export const defaultResearchSteps: readonly EnrichmentStep[] = [
  companySnapshotStep,
  taxonomyNormalizeStep,
];
