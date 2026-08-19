import type { ResearchContext } from './types';

/** Map a stored company row into the enrichment context. */
export function researchContextFromCompany(company: {
  id: string;
  name: string;
  one_liner: string | null;
  long_description: string | null;
  website: string | null;
  tags: readonly string[];
  industries: readonly string[];
  regions: readonly string[];
}): ResearchContext {
  return {
    companyId: company.id,
    name: company.name,
    oneLiner: company.one_liner,
    longDescription: company.long_description,
    website: company.website,
    tags: company.tags,
    industries: company.industries,
    regions: company.regions,
  };
}
