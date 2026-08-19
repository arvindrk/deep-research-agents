/**
 * Run per-company enrichment and optionally persist the research run.
 *
 * Usage:
 *   npx tsx scripts/run-company-research.ts --company-id=<uuid> --dry-run
 *   npx tsx scripts/run-company-research.ts --fixture=./company.json --dry-run
 *   npx tsx scripts/run-company-research.ts --company-id=<uuid>
 *
 * Steps are local and injectable (see src/lib/research/steps.ts). Live network
 * fetches are not required here; wire them at this edge later if needed.
 * Not wired into npm run verify or next build.
 */

import { readFileSync } from 'node:fs';

import { getCompanyById, insertResearchRun } from '../src/db';
import {
  defaultResearchSteps,
  researchContextFromCompany,
  runCompanyResearch,
  type EnrichmentStep,
  type ResearchContext,
} from '../src/lib/research';

type CliOptions = {
  companyId: string | null;
  fixture: string | null;
  dryRun: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  let companyId: string | null = null;
  let fixture: string | null = null;
  let dryRun = false;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg.startsWith('--company-id=')) {
      companyId = arg.slice('--company-id='.length) || null;
      continue;
    }
    if (arg.startsWith('--fixture=')) {
      fixture = arg.slice('--fixture='.length) || null;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!companyId && !fixture) {
    throw new Error('Provide --company-id=<uuid> or --fixture=<path>');
  }

  return { companyId, fixture, dryRun };
}

function printHelp(): void {
  console.log(`Run company research enrichment.

Options:
  --company-id=UUID   Load the company from the database
  --fixture=PATH      JSON company fixture (for dry-run without DB identity)
  --dry-run           Run steps and report status without persisting
  -h, --help          Show this help
`);
}

function readFixture(path: string): ResearchContext {
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Fixture must be a JSON object');
  }
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : 'fixture';
  const name = typeof record.name === 'string' ? record.name : '';
  if (!name) {
    throw new Error('Fixture requires a string name');
  }

  const asStringList = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === 'string')
      : [];

  return researchContextFromCompany({
    id,
    name,
    one_liner: typeof record.one_liner === 'string' ? record.one_liner : null,
    long_description:
      typeof record.long_description === 'string'
        ? record.long_description
        : null,
    website: typeof record.website === 'string' ? record.website : null,
    tags: asStringList(record.tags),
    industries: asStringList(record.industries),
    regions: asStringList(record.regions),
  });
}

async function loadContext(options: CliOptions): Promise<ResearchContext> {
  if (options.fixture) {
    return readFixture(options.fixture);
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const companyId = options.companyId;
  if (!companyId) {
    throw new Error('Missing --company-id');
  }

  const result = await getCompanyById(companyId);
  if (!result.success) {
    throw new Error(result.error);
  }

  return researchContextFromCompany(result.data);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const steps: readonly EnrichmentStep[] = defaultResearchSteps;
  const ctx = await loadContext(options);

  const startedAt = new Date();
  const run = await runCompanyResearch(ctx, steps);
  const finishedAt = new Date();

  console.log(
    JSON.stringify(
      {
        companyId: run.companyId,
        status: run.status,
        steps: run.steps.map((step) =>
          step.ok
            ? { stepId: step.stepId, required: step.required, ok: true }
            : {
                stepId: step.stepId,
                required: step.required,
                ok: false,
                error: step.error,
              },
        ),
        outputKeys: Object.keys(run.output),
      },
      null,
      2,
    ),
  );

  if (options.dryRun) {
    console.log('Dry run: research run not persisted');
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const saved = await insertResearchRun({
    companyId: run.companyId,
    status: run.status,
    steps: run.steps,
    output: run.output,
    startedAt,
    finishedAt,
  });

  if (!saved.success) {
    throw new Error(saved.error);
  }

  console.log(`Persisted research run ${saved.data.id} with status ${run.status}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(message);
  process.exit(1);
});
