/**
 * Backfill null company embeddings in batches.
 *
 * Usage:
 *   npx tsx scripts/backfill-embeddings.ts --dry-run
 *   npx tsx scripts/backfill-embeddings.ts --batch-size=32
 *
 * Not wired into npm run verify or next build. Requires DATABASE_URL and
 * OPENAI_API_KEY at runtime (never read at import of app modules for build).
 */

import {
  DEFAULT_EMBEDDING_BATCH_SIZE,
  buildCompanyEmbeddingText,
} from '../src/lib/company-embedding';
import { embedText } from '../src/lib/embed';
import {
  listCompaniesMissingEmbeddings,
  updateCompanyEmbedding,
} from '../src/db/queries/companies';

type CliOptions = {
  dryRun: boolean;
  batchSize: number;
  maxRows: number | null;
};

function parseArgs(argv: string[]): CliOptions {
  let dryRun = false;
  let batchSize = DEFAULT_EMBEDDING_BATCH_SIZE;
  let maxRows: number | null = null;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg.startsWith('--batch-size=')) {
      const value = Number(arg.slice('--batch-size='.length));
      if (!Number.isFinite(value) || value < 1) {
        throw new Error('Invalid --batch-size; expected a positive number');
      }
      batchSize = Math.floor(value);
      continue;
    }
    if (arg.startsWith('--max=')) {
      const value = Number(arg.slice('--max='.length));
      if (!Number.isFinite(value) || value < 1) {
        throw new Error('Invalid --max; expected a positive number');
      }
      maxRows = Math.floor(value);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { dryRun, batchSize, maxRows };
}

function printHelp(): void {
  console.log(`Backfill company embeddings.

Options:
  --dry-run          List work without calling the API or writing
  --batch-size=N     Page size (default ${DEFAULT_EMBEDDING_BATCH_SIZE})
  --max=N            Stop after N successful writes (or would-write in dry-run)
  -h, --help         Show this help
`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  if (!options.dryRun && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  let cursor: string | undefined;
  let processed = 0;
  let written = 0;

  console.log(
    options.dryRun
      ? `Dry run: batch-size=${options.batchSize}`
      : `Backfill: batch-size=${options.batchSize}`,
  );

  for (;;) {
    const remaining =
      options.maxRows === null ? options.batchSize : options.maxRows - processed;
    if (remaining <= 0) break;

    const pageLimit = Math.min(options.batchSize, remaining);
    const page = await listCompaniesMissingEmbeddings(pageLimit, cursor);
    if (!page.success) {
      throw new Error(page.error);
    }
    if (page.data.length === 0) {
      break;
    }

    for (const row of page.data) {
      const text = buildCompanyEmbeddingText(row);
      if (!text) {
        console.warn(`skip ${row.id}: no text to embed`);
        processed += 1;
        continue;
      }

      if (options.dryRun) {
        console.log(`would embed ${row.id} (${text.length} chars)`);
        written += 1;
        processed += 1;
        continue;
      }

      const vector = await embedText(text);
      const update = await updateCompanyEmbedding(row.id, vector);
      if (!update.success) {
        throw new Error(`Failed on ${row.id}: ${update.error}`);
      }
      console.log(`embedded ${row.id}`);
      written += 1;
      processed += 1;
    }

    cursor = page.data[page.data.length - 1].id;
    if (page.data.length < pageLimit) {
      break;
    }
  }

  console.log(
    options.dryRun
      ? `Dry run complete: ${written} row(s) would be written (${processed} considered)`
      : `Backfill complete: ${written} row(s) written (${processed} considered)`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(message);
  process.exit(1);
});
