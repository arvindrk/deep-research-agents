import { NextResponse } from 'next/server';

import { COMPANY_NOT_FOUND, getCompanyById } from '@/db/queries/companies';
import { getRecentResearchRuns } from '@/db/queries/research';
import { parseCompanyId } from '@/lib/company-id';
import { companyResearchCacheHeaders } from '@/lib/company-research-cache-policy';
import {
  buildCompanyResearchPayload,
  toResearchRunDisplayInputs,
} from '@/lib/research/api-payload';

const INVALID_ID = { error: 'Invalid company id' };
const NOT_FOUND = { error: 'Company not found' };
const READ_FAILED = { error: 'Unable to load company research' };

type RouteContext = { params: Promise<{ id: string }> };

/**
 * One company's research, assembled by the same builder the company page
 * renders, so the two answers cannot drift. Validates before it reads, and
 * every failure exit is closed copy: a caller never sees driver text, and the
 * payload carries no embedding.
 *
 * A failed history read is not an error here. The payload says so, because a
 * company with an unreadable history is still a company worth answering about.
 *
 * Every exit carries the cache policy for its outcome: the answer may be
 * shared for a few minutes, and nothing else is stored at all.
 */
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const parsed = parseCompanyId((await context.params).id);
  if (!parsed.ok) {
    return NextResponse.json(INVALID_ID, {
      status: 400,
      headers: companyResearchCacheHeaders('invalid_company_id'),
    });
  }

  const companyId = parsed.value;

  // Independent reads, as on the page: neither needs the other's result.
  const [company, research] = await Promise.all([
    getCompanyById(companyId),
    getRecentResearchRuns(companyId),
  ]);

  if (!company.success) {
    if (company.error === COMPANY_NOT_FOUND) {
      return NextResponse.json(NOT_FOUND, {
        status: 404,
        headers: companyResearchCacheHeaders('company_not_found'),
      });
    }
    return NextResponse.json(READ_FAILED, {
      status: 503,
      headers: companyResearchCacheHeaders('company_read_failed'),
    });
  }

  return NextResponse.json(
    buildCompanyResearchPayload({
      companyId,
      runsNewestFirst: toResearchRunDisplayInputs(
        research.success ? research.data : [],
      ),
      historyLoaded: research.success,
      now: new Date(),
    }),
    { headers: companyResearchCacheHeaders('ok') },
  );
}
