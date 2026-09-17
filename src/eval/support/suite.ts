import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * The eval suite, described from the outside. Everything here reads the
 * repository and nothing else: the suite is discovered by glob, so the only
 * honest way to check it is to enumerate the tree the glob covers rather than
 * to keep a list that can be forgotten.
 */
const REPO_ROOT = process.cwd();
const EVAL_DIR = 'src/eval';

export const readRepoFile = (path: string): string =>
  readFileSync(join(REPO_ROOT, path), 'utf8');

/** Every .ts file under a directory, in a stable order, repo-relative. */
export function typescriptFilesUnder(dir: string): string[] {
  return readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })
    .flatMap((entry) => {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return typescriptFilesUnder(path);
      return /\.tsx?$/.test(entry.name) ? [path] : [];
    })
    .sort();
}

/** Files `npm run eval` runs: the glob is `src/eval/**\/*.eval.ts`. */
export const suiteFiles = (): string[] =>
  typescriptFilesUnder(EVAL_DIR).filter((path) => path.endsWith('.eval.ts'));

/** Every file under src/eval, of any kind, repo-relative. */
export function evalTreeFiles(dir = EVAL_DIR): string[] {
  return readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })
    .flatMap((entry) => {
      const path = `${dir}/${entry.name}`;
      return entry.isDirectory() ? evalTreeFiles(path) : [path];
    })
    .sort();
}

/** Modules under src/eval that the glob does not run, so nothing exercises them alone. */
export const supportModules = (): string[] =>
  typescriptFilesUnder(EVAL_DIR).filter((path) => !path.endsWith('.eval.ts'));

/** Static import specifiers, which is all this repository uses. */
export function importsOf(path: string): string[] {
  const source = readRepoFile(path);
  const specifiers: string[] = [];
  const pattern = /(?:^|\n)\s*import\s[^'"]*from\s*'([^']+)'/g;

  for (
    let match = pattern.exec(source);
    match !== null;
    match = pattern.exec(source)
  ) {
    specifiers.push(match[1]);
  }

  return specifiers;
}

/** A specifier resolved to a repo-relative path, or null when it is not local. */
export function resolveLocal(from: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;

  const fromDir = resolve(REPO_ROOT, from, '..');
  const target = resolve(fromDir, specifier);
  const repoRelative = relative(REPO_ROOT, target);
  if (repoRelative.startsWith('..')) return null;

  for (const candidate of [
    repoRelative,
    `${repoRelative}.ts`,
    `${repoRelative}.tsx`,
    `${repoRelative}/index.ts`,
  ]) {
    try {
      readRepoFile(candidate);
      return candidate;
    } catch {
      // Not this spelling.
    }
  }

  return repoRelative;
}

const readsRepository = (path: string): boolean =>
  /\breadFileSync\b|\breaddirSync\b/.test(readRepoFile(path));

const isInsideEvalDir = (path: string): boolean => path.startsWith(`${EVAL_DIR}/`);

/**
 * Does this file end up asserting against something outside the eval tree?
 * Either it imports production code (through the `@/` alias, or a relative
 * path that leaves src/eval, as the logview eval does), or it reads repository
 * files, or it does so through a support module under src/eval.
 */
export function reachesProduction(path: string, seen = new Set<string>()): boolean {
  if (seen.has(path)) return false;
  seen.add(path);

  if (readsRepository(path)) return true;

  for (const specifier of importsOf(path)) {
    if (specifier.startsWith('node:')) continue;
    if (specifier.startsWith('@/')) return true;

    const local = resolveLocal(path, specifier);
    if (local === null) continue;
    if (!isInsideEvalDir(local)) return true;
    if (local.endsWith('.json')) continue;
    if (reachesProduction(local, seen)) return true;
  }

  return false;
}
