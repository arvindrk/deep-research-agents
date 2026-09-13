import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The migration chain, replayed. Asserting that a file somewhere creates an
 * index says nothing about the schema a human ends up with: a later migration
 * can drop it and the file stays in the repository forever. These helpers read
 * the files in apply order and report what is left standing.
 *
 * Explicit indexes only. A PRIMARY KEY or an inline UNIQUE in CREATE TABLE also
 * creates one, and nothing here pretends otherwise.
 */
const MIGRATIONS_DIR = join(process.cwd(), 'migrations');

export type MigrationFile = { name: string; sql: string };

export type MigrationIndex = {
  name: string;
  table: string;
  /** Column names in key order, without a sort direction. */
  columns: string[];
  unique: boolean;
  createdBy: string;
};

export type IndexStatement = {
  kind: 'create' | 'drop';
  raw: string;
  migration: string;
};

const withoutComments = (sql: string): string =>
  sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

/** Every migration in apply order, comments stripped. */
export function migrationFiles(): MigrationFile[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({
      name,
      sql: withoutComments(readFileSync(join(MIGRATIONS_DIR, name), 'utf8')),
    }));
}

export function indexStatements(): IndexStatement[] {
  const statements: IndexStatement[] = [];
  for (const file of migrationFiles()) {
    for (const raw of file.sql.match(/CREATE\s+(?:UNIQUE\s+)?INDEX[^;]*/gi) ?? []) {
      statements.push({ kind: 'create', raw, migration: file.name });
    }
    for (const raw of file.sql.match(/DROP\s+INDEX[^;]*/gi) ?? []) {
      statements.push({ kind: 'drop', raw, migration: file.name });
    }
  }
  return statements;
}

const CREATE =
  /^CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+ON\s+(\w+)\s*\(([^)]*)\)/i;
const DROP = /^DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?(\w+)/i;

export type ChainReplay = {
  /** Indexes still standing after the last migration. */
  indexes: MigrationIndex[];
  /** Statements the parser did not understand, which must stay empty. */
  unparsed: IndexStatement[];
  /** Index names a migration dropped, with the file that did it. */
  dropped: { name: string; migration: string }[];
};

export function replayIndexChain(): ChainReplay {
  const standing = new Map<string, MigrationIndex>();
  const unparsed: IndexStatement[] = [];
  const dropped: { name: string; migration: string }[] = [];

  for (const statement of indexStatements()) {
    const normalised = statement.raw.replace(/\s+/g, ' ').trim();

    if (statement.kind === 'create') {
      const match = CREATE.exec(normalised);
      if (!match) {
        unparsed.push(statement);
        continue;
      }
      standing.set(match[2], {
        name: match[2],
        table: match[3],
        columns: match[4]
          .split(',')
          .map((column) => column.trim().split(/\s+/)[0])
          .filter((column) => column.length > 0),
        unique: Boolean(match[1]),
        createdBy: statement.migration,
      });
      continue;
    }

    const match = DROP.exec(normalised);
    if (!match) {
      unparsed.push(statement);
      continue;
    }
    standing.delete(match[1]);
    dropped.push({ name: match[1], migration: statement.migration });
  }

  return { indexes: [...standing.values()], unparsed, dropped };
}

/** Indexes that can serve an equality predicate on `column` for `table`. */
export function leadingColumnIndexes(
  table: string,
  column: string,
): MigrationIndex[] {
  return replayIndexChain().indexes.filter(
    (index) => index.table === table && index.columns[0] === column,
  );
}
