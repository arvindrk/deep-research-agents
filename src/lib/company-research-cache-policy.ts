import { NO_STORE, sharedAnswerPolicy } from './http-cache-policy';

/** Every terminal outcome of one company research request. */
export const COMPANY_RESEARCH_OUTCOMES = [
  'ok',
  'invalid_company_id',
  'company_not_found',
  'company_read_failed',
] as const;

export type CompanyResearchOutcome =
  (typeof COMPANY_RESEARCH_OUTCOMES)[number];

/**
 * A research answer changes only when a research run lands for that company,
 * and the scheduler cannot revisit one company more than once a day, so five
 * minutes of shared reuse cannot hide a finding for long. It is deliberately
 * longer than the search policy: search changes whenever anything is ingested.
 */
export const COMPANY_RESEARCH_SHARED_MAX_AGE_SECONDS = 300;
export const COMPANY_RESEARCH_STALE_WHILE_REVALIDATE_SECONDS = 900;

/**
 * Nothing but the answer is stored. A 404 here means "not ingested yet" and
 * ingestion runs continuously, so a cached miss would hide a company that has
 * just arrived; a cached 503 would outlive the outage it describes; and a
 * refused id costs nothing to refuse again.
 */
export const COMPANY_RESEARCH_CACHE_CONTROL: Record<
  CompanyResearchOutcome,
  string
> = {
  ok: sharedAnswerPolicy(
    COMPANY_RESEARCH_SHARED_MAX_AGE_SECONDS,
    COMPANY_RESEARCH_STALE_WHILE_REVALIDATE_SECONDS,
  ),
  invalid_company_id: NO_STORE,
  company_not_found: NO_STORE,
  company_read_failed: NO_STORE,
};

/** The headers one research exit sends, so no exit spells the policy itself. */
export function companyResearchCacheHeaders(
  outcome: CompanyResearchOutcome,
): Record<string, string> {
  return { 'Cache-Control': COMPANY_RESEARCH_CACHE_CONTROL[outcome] };
}
