/**
 * Ingest and refresh companies from a source export.
 *
 * Usage:
 *   npx tsx scripts/ingest-companies.ts --file=./companies.json --dry-run
 *   npx tsx scripts/ingest-companies.ts --file=./companies.json --cursor=acme-1
 *
 * Resumable: every record processed prints the cursor to resume from, and a
 * cursor excludes the record it names. Idempotent: an unchanged record only has
 * its sync time touched, and re-embedding happens only when embedded text
 * changed. Not wired into npm run verify or next build.
 */

import { readFileSync } from 'node:fs';

import {
  getCompanyBySource,
  insertCompanyFromSource,
  touchCompanySyncedAt,
  updateCompanyFromSource,
} from '../src/db/queries/companies';
import {
  decideRefresh,
  nextCursor,
  recordsAfterCursor,
  type RefreshDecision,
  type StoredCompany,
} from '../src/lib/ingestion/refresh-plan';
import {
  parseSourceCompany,
  type SourceCompanyRecord,
} from '../src/lib/ingestion/source-record';
import { refreshCompanyEmbedding } from '../src/lib/refresh-company-embedding';
import type { QueryResult } from '../src/db/types';

type CliOptions = {
  file: string;
  dryRun: boolean;
  cursor: string | null;
  maxRecords: number | null;
};

function parseArgs(argv: string[]): CliOptions {
  let file = '';
  let dryRun = false;
  let cursor: string | null = null;
  let maxRecords: number | null = null;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg.startsWith('--file=')) {
      file = arg.slice('--file='.length);
      continue;
    }
    if (arg.startsWith('--cursor=')) {
      cursor = arg.slice('--cursor='.length) || null;
      continue;
    }
    if (arg.startsWith('--max=')) {
      const value = Number(arg.slice('--max='.length));
      if (!Number.isFinite(value) || value < 1) {
        throw new Error('Invalid --max; expected a positive number');
      }
      maxRecords = Math.floor(value);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!file) {
    throw new Error('Missing --file=<path to a JSON array of source records>');
  }

  return { file, dryRun, cursor, maxRecords };
}

function printHelp(): void {
  console.log(`Ingest and refresh companies from a source export.

Options:
  --file=PATH        JSON array of source company records (required)
  --dry-run          Report decisions without writing or embedding
  --cursor=SOURCE_ID Resume after this source id
  --max=N            Stop after N records
  -h, --help         Show this help
`);
}

/** Invalid records are reported and skipped: one bad row is not a failed run. */
function readRecords(file: string): SourceCompanyRecord[] {
  const raw: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error('Source file must contain a JSON array');
  }

  const records: SourceCompanyRecord[] = [];
  raw.forEach((entry, index) => {
    const parsed = parseSourceCompany(entry);
    if (parsed.ok) {
      records.push(parsed.value);
    } else {
      console.warn(`skip record ${index}: ${parsed.error}`);
    }
  });
  return records;
}

/**
 * A null stored company means the row is not there, whatever the decision said,
 * so inserting is the only correct action rather than updating a missing id.
 */
async function applyDecision(
  decision: RefreshDecision,
  stored: StoredCompany | null,
  record: SourceCompanyRecord,
): Promise<QueryResult<{ id: string }>> {
  if (stored === null || decision.action === 'insert') {
    return insertCompanyFromSource(record);
  }
  return decision.action === 'update'
    ? updateCompanyFromSource(stored.id, record)
    : touchCompanySyncedAt(stored.id);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pending = recordsAfterCursor(
    readRecords(options.file),
    options.cursor,
  ).slice(0, options.maxRecords ?? undefined);

  console.log(
    `${options.dryRun ? 'Dry run' : 'Ingest'}: ${pending.length} record(s) after cursor ${options.cursor ?? '(start)'}`,
  );

  const counts = { insert: 0, update: 0, touch: 0, reembed: 0, failed: 0 };
  let cursor = options.cursor;

  for (const record of pending) {
    const stored = await getCompanyBySource(record.source, record.source_id);
    if (!stored.success) {
      console.error(`failed ${record.source_id}: ${stored.error}`);
      counts.failed += 1;
      break;
    }

    const decision = decideRefresh(stored.data, record);
    counts[decision.action] += 1;

    if (options.dryRun) {
      console.log(
        `would ${decision.action} ${record.source_id} (${decision.reason})${decision.reembed ? ' + re-embed' : ''}`,
      );
      cursor = nextCursor([record], cursor);
      continue;
    }

    const written = await applyDecision(decision, stored.data, record);

    if (!written.success) {
      console.error(`failed ${record.source_id}: ${written.error}`);
      counts.failed += 1;
      break;
    }

    if (decision.reembed) {
      const embedded = await refreshCompanyEmbedding(written.data.id, record);
      if (!embedded.success) {
        console.error(`embed failed ${record.source_id}: ${embedded.error}`);
        counts.failed += 1;
        break;
      }
      counts.reembed += 1;
    }

    console.log(`${decision.action} ${record.source_id} (${decision.reason})`);
    cursor = nextCursor([record], cursor);
  }

  console.log(
    `inserted=${counts.insert} updated=${counts.update} touched=${counts.touch} re-embedded=${counts.reembed} failed=${counts.failed}`,
  );
  console.log(`resume with --cursor=${cursor ?? ''}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(message);
  process.exit(1);
});
