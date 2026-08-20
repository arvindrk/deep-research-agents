import { randomUUID } from 'node:crypto';

import { getDBClient } from '../client';
import { withRetry } from '../resilience';
import type { QueryResult } from '../types';
import type {
  ResearchRun,
  ResearchRunStatus,
  ResearchSourceFailure,
} from '@/lib/research/run';
import {
  RESEARCH_SOURCES,
  type FindingConfidence,
  type ResearchFinding,
  type ResearchSourceId,
} from '@/lib/research/types';

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

export type StoredResearchRun = ResearchRun & { id: string };

/** Rows are a runtime boundary: narrow them, never cast them. */
const asSource = (value: unknown): ResearchSourceId | null =>
  RESEARCH_SOURCES.find((source) => source === value) ?? null;

const asConfidence = (value: unknown): FindingConfidence =>
  value === 'high' || value === 'low' ? value : 'medium';

/** An unrecognised status is treated as failed. Absence of evidence is not a pass. */
const asStatus = (value: unknown): ResearchRunStatus =>
  value === 'complete' || value === 'partial' ? value : 'failed';

const asIsoString = (value: unknown): string =>
  value instanceof Date ? value.toISOString() : String(value ?? '');

const asSourceList = (value: unknown): ResearchSourceId[] =>
  Array.isArray(value)
    ? value.map(asSource).filter((source): source is ResearchSourceId => source !== null)
    : [];

const asFailures = (value: unknown): ResearchSourceFailure[] => {
  if (!Array.isArray(value)) return [];
  const failures: ResearchSourceFailure[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const source = asSource(record.source);
    if (source && typeof record.error === 'string') {
      failures.push({ source, error: record.error });
    }
  }
  return failures;
};

const asFinding = (row: Record<string, unknown>): ResearchFinding | null => {
  const source = asSource(row.source);
  if (!source || typeof row.field !== 'string' || typeof row.value !== 'string') {
    return null;
  }
  return {
    source,
    field: row.field,
    value: row.value,
    evidence_url: typeof row.evidence_url === 'string' ? row.evidence_url : null,
    observed_at: asIsoString(row.observed_at),
    confidence: asConfidence(row.confidence),
  };
};

/**
 * The most recent run for one company, with the findings that run produced.
 * Returns null when the company has never been researched, which is different
 * from a failed read and is reported differently.
 */
export async function getLatestResearchRun(
  companyId: string,
): Promise<QueryResult<StoredResearchRun | null>> {
  try {
    const sql = getDBClient();

    const runs = await withRetry(
      () => sql`
        SELECT id, company_id, status, attempted, succeeded, failed, observed_at
        FROM company_research_runs
        WHERE company_id = ${companyId}
        ORDER BY observed_at DESC
        LIMIT 1
      `,
    );

    if (runs.length === 0) {
      return { success: true, data: null };
    }

    const run = runs[0];
    const runId = String(run.id);

    const findingRows = await withRetry(
      () => sql`
        SELECT source, field, value, evidence_url, confidence, observed_at
        FROM company_research_findings
        WHERE run_id = ${runId}
        ORDER BY field
      `,
    );

    return {
      success: true,
      data: {
        id: runId,
        company_id: String(run.company_id),
        status: asStatus(run.status),
        attempted: asSourceList(run.attempted),
        succeeded: asSourceList(run.succeeded),
        failed: asFailures(run.failed),
        findings: findingRows
          .map(asFinding)
          .filter((finding): finding is ResearchFinding => finding !== null),
        observed_at: asIsoString(run.observed_at),
      },
    };
  } catch {
    return { success: false, error: 'Failed to read research for company' };
  }
}
