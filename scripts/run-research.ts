/**
 * Run the research agents over companies and record what they find.
 *
 * Usage:
 *   npx tsx scripts/run-research.ts --dry-run --limit=5
 *   npx tsx scripts/run-research.ts --limit=50
 *
 * Requires the tables in migrations/0001_company_research.sql to be applied.
 * A run that partly fails is recorded as partial, never as complete, and never
 * half-written: the run and its findings land in one transaction.
 *
 * Selection prefers companies with missing or stale newest findings, caps how
 * many run this pass, and prints every skip reason.
 */

import {
  insertResearchRun,
  listCompaniesForResearchSchedule,
} from '../src/db/queries/research';
import { emitResearchEvent } from '../src/lib/observability/emit';
import {
  buildResearchRunEvent,
  buildResearchScheduleEvent,
} from '../src/lib/observability/research-event';
import { selectResearchSchedule } from '../src/lib/research/schedule';
import { DEFAULT_COLLECTORS, runResearch } from '../src/lib/research/runtime';
import type { ResearchSubject } from '../src/lib/research/types';

type CliOptions = {
  dryRun: boolean;
  limit: number;
};

/** Fetch a few pages worth of candidates so fresh skips do not starve the cap. */
const CANDIDATE_MULTIPLIER = 5;
const CANDIDATE_CAP = 200;

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let limit = 10;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const value = Number(arg.slice('--limit='.length));
      if (!Number.isFinite(value) || value < 1) {
        throw new Error('Invalid --limit; expected a positive number');
      }
      limit = Math.floor(value);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`Run research over companies.

Options:
  --dry-run     Collect and report findings without writing them
  --limit=N     Companies to research this run (default 10)
  -h, --help    Show this help
`);
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { dryRun, limit };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const candidateLimit = Math.min(
    Math.max(options.limit * CANDIDATE_MULTIPLIER, options.limit),
    CANDIDATE_CAP,
  );

  const page = await listCompaniesForResearchSchedule(candidateLimit);
  if (!page.success) {
    throw new Error(page.error);
  }

  const now = new Date();
  const schedule = selectResearchSchedule(
    page.data.map((row) => ({
      company_id: row.id,
      newest_finding_at: row.newest_finding_at,
    })),
    now,
    options.limit,
  );

  const skipCounts = { fresh: 0, over_cap: 0 };
  for (const skip of schedule.skipped) {
    skipCounts[skip.reason] += 1;
  }

  emitResearchEvent(
    buildResearchScheduleEvent({
      selectedCount: schedule.selected.length,
      skipCounts,
    }),
  );

  const byId = new Map(page.data.map((row) => [row.id, row]));
  const observedAt = now.toISOString();
  const counts = {
    complete: 0,
    partial: 0,
    failed: 0,
    findings: 0,
    unwritten: 0,
  };

  for (const companyId of schedule.selected) {
    const company = byId.get(companyId);
    if (!company) continue;

    const subject: ResearchSubject = {
      id: company.id,
      name: company.name,
      website: company.website,
    };

    const startedMs = Date.now();
    const run = await runResearch(subject, DEFAULT_COLLECTORS, observedAt);
    const durationMs = Date.now() - startedMs;
    counts[run.status] += 1;
    counts.findings += run.findings.length;

    emitResearchEvent(
      buildResearchRunEvent({
        status: run.status,
        companyId: company.id,
        attempted: run.attempted,
        succeeded: run.succeeded,
        failed: run.failed.map((failure) => failure.source),
        findingsCount: run.findings.length,
        durationMs,
      }),
    );

    const detail = run.failed.map((failure) => failure.error).join('; ');
    console.log(
      `${run.status} ${company.id} findings=${run.findings.length}${detail ? ` failed=${detail}` : ''}`,
    );

    if (options.dryRun) {
      continue;
    }

    const written = await insertResearchRun(run);
    if (!written.success) {
      console.error(`could not record ${company.id}: ${written.error}`);
      counts.unwritten += 1;
    }
  }

  console.log(
    `selected=${schedule.selected.length} skipped_fresh=${skipCounts.fresh} skipped_over_cap=${skipCounts.over_cap}`,
  );
  console.log(
    `complete=${counts.complete} partial=${counts.partial} failed=${counts.failed} findings=${counts.findings} unwritten=${counts.unwritten}`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(message);
  process.exit(1);
});
