import { randomUUID } from 'node:crypto';

import { getDBClient } from '../client';
import { withRetry } from '../resilience';
import type { QueryResult } from '../types';
import type { ResearchRun } from '@/lib/research/run';

/**
 * Writes a run and its findings in one transaction. All or nothing: a run that
 * reported itself partial must not also be half-written, or a reader cannot
 * tell which half it has.
 *
 * The run id is generated here rather than returned by the insert, so both
 * statements fit in a single non-interactive transaction.
 */
export async function insertResearchRun(
  run: ResearchRun,
): Promise<QueryResult<{ id: string }>> {
  try {
    const sql = getDBClient();
    const runId = randomUUID();

    await withRetry(() =>
      sql.transaction([
        sql`
          INSERT INTO company_research_runs (
            id, company_id, status, attempted, succeeded, failed, observed_at
          ) VALUES (
            ${runId}, ${run.company_id}, ${run.status}, ${run.attempted},
            ${run.succeeded}, ${JSON.stringify(run.failed)}::jsonb,
            ${run.observed_at}
          )
        `,
        ...run.findings.map(
          (finding) => sql`
            INSERT INTO company_research_findings (
              run_id, company_id, source, field, value, evidence_url,
              confidence, observed_at
            ) VALUES (
              ${runId}, ${run.company_id}, ${finding.source}, ${finding.field},
              ${finding.value}, ${finding.evidence_url}, ${finding.confidence},
              ${finding.observed_at}
            )
          `,
        ),
      ]),
    );

    return { success: true, data: { id: runId } };
  } catch {
    return { success: false, error: 'Failed to record research run' };
  }
}
