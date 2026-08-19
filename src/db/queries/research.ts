import { getDBClient } from '../client';
import { withRetry } from '../resilience';
import type { ResearchRunStatus } from '@/lib/research/types';
import type { QueryResult } from '../types';

export type ResearchRunRow = {
  id: string;
  company_id: string;
  status: ResearchRunStatus;
  steps: unknown;
  output: unknown;
  started_at: Date;
  finished_at: Date;
  created_at: Date;
};

export type InsertResearchRunInput = {
  companyId: string;
  status: ResearchRunStatus;
  steps: unknown;
  output: unknown;
  startedAt: Date;
  finishedAt: Date;
};

/** Persist one research run. Status must already be aggregated by the runtime. */
export async function insertResearchRun(
  input: InsertResearchRunInput,
): Promise<QueryResult<{ id: string }>> {
  try {
    const sql = getDBClient();
    const stepsJson = JSON.stringify(input.steps);
    const outputJson = JSON.stringify(input.output);
    const results = await withRetry(
      () => sql`
        INSERT INTO company_research_runs (
          company_id, status, steps, output, started_at, finished_at
        ) VALUES (
          ${input.companyId},
          ${input.status},
          ${stepsJson}::jsonb,
          ${outputJson}::jsonb,
          ${input.startedAt.toISOString()},
          ${input.finishedAt.toISOString()}
        )
        RETURNING id
      `,
    );

    if (results.length === 0) {
      return { success: false, error: 'Failed to insert research run' };
    }

    return { success: true, data: { id: String(results[0].id) } };
  } catch {
    return { success: false, error: 'Failed to insert research run' };
  }
}

export async function getResearchRunById(
  id: string,
): Promise<QueryResult<ResearchRunRow>> {
  try {
    const sql = getDBClient();
    const results = await withRetry(
      () => sql`
        SELECT
          id, company_id, status, steps, output,
          started_at, finished_at, created_at
        FROM company_research_runs
        WHERE id = ${id}
        LIMIT 1
      `,
    );

    if (results.length === 0) {
      return { success: false, error: 'Research run not found' };
    }

    const row = results[0] as ResearchRunRow;
    return {
      success: true,
      data: {
        ...row,
        id: String(row.id),
        status: row.status,
      },
    };
  } catch {
    return { success: false, error: 'Failed to read research run' };
  }
}
