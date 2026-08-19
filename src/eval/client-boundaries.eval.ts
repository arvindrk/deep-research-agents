import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';

const REPO_ROOT = process.cwd();
const SRC_DIR = join(REPO_ROOT, 'src');

/**
 * Every file allowed to ship client JavaScript, with why it needs to. Server
 * rendering is the default here, so growing this map is a decision that shows
 * up in review rather than a directive that slips in with a component.
 */
const CLIENT_ALLOWLIST: Record<string, string> = {
  'src/app/error.tsx': 'App Router error boundaries must be client components',
  'src/app/companies/[id]/error.tsx':
    'App Router error boundaries must be client components',
  'src/components/company-logo.tsx': 'owns image load-failure state',
};

function componentFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...componentFiles(path));
    } else if (entry.name.endsWith('.tsx')) {
      found.push(path);
    }
  }
  return found;
}

const declaresUseClient = (path: string): boolean =>
  /^\s*['"]use client['"]/.test(readFileSync(path, 'utf8'));

const clientFiles = componentFiles(SRC_DIR)
  .filter(declaresUseClient)
  .map((path) => relative(REPO_ROOT, path))
  .sort();

describe('client boundaries', () => {
  it('ships client JavaScript only from allowlisted files', () => {
    assert.deepEqual(
      clientFiles,
      Object.keys(CLIENT_ALLOWLIST).sort(),
      'a component gained or lost "use client"; update the allowlist with the reason',
    );
  });

  it('gives every allowlisted file a reason', () => {
    for (const [file, reason] of Object.entries(CLIENT_ALLOWLIST)) {
      assert.ok(reason.length > 0, `${file} is allowlisted without a reason`);
    }
  });
});
