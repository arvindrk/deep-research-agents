/**
 * Record one company's latest research run into the quality fixture corpus.
 *
 * Usage:
 *   npx tsx scripts/record-research-fixture.ts --company=<id>
 *   npx tsx scripts/record-research-fixture.ts --company=<id> --out=./corpus.json
 *
 * The corpus is what `src/eval/research-corpus.eval.ts` measures enrichment
 * against, so this is how the bar stays connected to real runs rather than to
 * hand-written optimism. Prints the resulting report and any bar violations
 * before writing, so a regression is visible at record time.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { getLatestResearchRun } from '../src/db/queries/research';
import type { ResearchRun } from '../src/lib/research/run';
import {
  qualityReport,
  qualityViolations,
} from '../src/lib/research/quality';

const DEFAULT_OUT = 'src/eval/fixtures/research-runs.json';

type Corpus = {
  note?: string;
  recorded_as_of: string;
  runs: ResearchRun[];
};

function parseArgs(argv: string[]): { companyId: string; out: string } {
  let companyId = '';
  let out = DEFAULT_OUT;

  for (const arg of argv) {
    if (arg.startsWith('--company=')) {
      companyId = arg.slice('--company='.length);
      continue;
    }
    if (arg.startsWith('--out=')) {
      out = arg.slice('--out='.length);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`Record a company's latest research run into the fixture corpus.

Options:
  --company=ID   Company to record (required)
  --out=PATH     Corpus file (default ${DEFAULT_OUT})
  -h, --help     Show this help
`);
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!companyId) {
    throw new Error('Missing --company=<id>');
  }

  return { companyId, out };
}

async function main(): Promise<void> {
  const { companyId, out } = parseArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const latest = await getLatestResearchRun(companyId);
  if (!latest.success) {
    throw new Error(latest.error);
  }
  if (!latest.data) {
    throw new Error(`No research recorded for ${companyId}`);
  }

  const corpus = JSON.parse(readFileSync(out, 'utf8')) as Corpus;

  // The stored run id is a database detail; the corpus records what was found.
  const { company_id, status, attempted, succeeded, failed, findings, observed_at } =
    latest.data;

  corpus.runs = [
    ...corpus.runs.filter((entry) => entry.company_id !== companyId),
    { company_id, status, attempted, succeeded, failed, findings, observed_at },
  ];
  corpus.recorded_as_of = new Date().toISOString();

  const report = qualityReport(corpus.runs, new Date(corpus.recorded_as_of));
  const violations = qualityViolations(report);

  console.log(JSON.stringify(report, null, 2));
  for (const violation of violations) {
    console.warn(`bar violation: ${violation}`);
  }

  writeFileSync(out, `${JSON.stringify(corpus, null, 2)}\n`);
  console.log(`recorded ${companyId} into ${out} (${corpus.runs.length} runs)`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(message);
  process.exit(1);
});
