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

/** Cap for company detail: latest plus one prior when the latest failed. */
const RECENT_RESEARCH_RUNS_LIMIT = 2;

const toStoredRun = (
  run: Record<string, unknown>,
  findings: ResearchFinding[],
): StoredResearchRun => ({
  id: String(run.id),
  company_id: String(run.company_id),
  status: asStatus(run.status),
  attempted: asSourceList(run.attempted),
  succeeded: asSourceList(run.succeeded),
  failed: asFailures(run.failed),
  findings,
  observed_at: asIsoString(run.observed_at),
});

/**
 * Up to two newest runs for one company, each with that run's findings only.
 * Bounded LIMIT on runs; findings loaded in one query for those run ids (no N+1).
 */
export async function getRecentResearchRuns(
  companyId: string,
): Promise<QueryResult<StoredResearchRun[]>> {
  try {
    const sql = getDBClient();

    const runs = await withRetry(
      () => sql`
        SELECT id, company_id, status, attempted, succeeded, failed, observed_at
        FROM company_research_runs
        WHERE company_id = ${companyId}
        ORDER BY observed_at DESC
        LIMIT ${RECENT_RESEARCH_RUNS_LIMIT}
      `,
    );

    if (runs.length === 0) {
      return { success: true, data: [] };
    }

    const runIds = runs.map((run) => String(run.id));
    const findingRows = await withRetry(() =>
      runIds.length === 1
        ? sql`
            SELECT run_id, source, field, value, evidence_url, confidence, observed_at
            FROM company_research_findings
            WHERE run_id = ${runIds[0]}
            ORDER BY field
          `
        : sql`
            SELECT run_id, source, field, value, evidence_url, confidence, observed_at
            FROM company_research_findings
            WHERE run_id = ${runIds[0]} OR run_id = ${runIds[1]}
            ORDER BY field
          `,
    );

    const findingsByRun = new Map<string, ResearchFinding[]>();
    for (const row of findingRows) {
      const finding = asFinding(row);
      if (!finding) continue;
      const runId = String(row.run_id);
      const list = findingsByRun.get(runId);
      if (list) {
        list.push(finding);
      } else {
        findingsByRun.set(runId, [finding]);
      }
    }

    return {
      success: true,
      data: runs.map((run) =>
        toStoredRun(run, findingsByRun.get(String(run.id)) ?? []),
      ),
    };
  } catch {
    return { success: false, error: 'Failed to read research for company' };
  }
}

/**
 * The most recent run for one company, with the findings that run produced.
 * Returns null when the company has never been researched, which is different
 * from a failed read and is reported differently.
 */
export async function getLatestResearchRun(
  companyId: string,
): Promise<QueryResult<StoredResearchRun | null>> {
  const recent = await getRecentResearchRuns(companyId);
  if (!recent.success) {
    return { success: false, error: recent.error };
  }
  return { success: true, data: recent.data[0] ?? null };
}

/** One company plus the observation time of its newest finding, if any. */
export type CompanyResearchScheduleRow = {
  id: string;
  name: string;
  website: string | null;
  newest_finding_at: string | null;
};

/**
 * Companies ordered for a research cadence: never researched first, then the
 * oldest newest-finding. One bounded query; the pure scheduler decides fresh
 * skips and the concurrency cap.
 *
 * Intended plan: index on findings (company_id, observed_at DESC) and companies
 * primary key; LATERAL picks one row per company, outer LIMIT bounds the scan.
 */
export async function listCompaniesForResearchSchedule(
  limit: number,
): Promise<QueryResult<CompanyResearchScheduleRow[]>> {
  try {
    const sql = getDBClient();
    const bound = Math.max(1, Math.floor(limit));

    const rows = await withRetry(
      () => sql`
        SELECT
          c.id,
          c.name,
          c.website,
          newest.observed_at AS newest_finding_at
        FROM companies c
        LEFT JOIN LATERAL (
          SELECT f.observed_at
          FROM company_research_findings f
          WHERE f.company_id = c.id
          ORDER BY f.observed_at DESC
          LIMIT 1
        ) newest ON true
        ORDER BY newest.observed_at ASC NULLS FIRST, c.id ASC
        LIMIT ${bound}
      `,
    );

    return {
      success: true,
      data: rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        website: row.website == null ? null : String(row.website),
        newest_finding_at:
          row.newest_finding_at == null
            ? null
            : asIsoString(row.newest_finding_at),
      })),
    };
  } catch {
    return {
      success: false,
      error: 'Failed to list companies for research schedule',
    };
  }
}
