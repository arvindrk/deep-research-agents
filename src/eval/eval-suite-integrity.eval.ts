import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readRepoFile, suiteFiles } from './support/suite';

describe('the suite the verify gate runs', () => {
  const packageJson = readRepoFile('package.json');

  it('is discovered by one glob, declared in one place', () => {
    assert.match(packageJson, /"eval": "node --import tsx --test \\"src\/eval\/\*\*\/\*\.eval\.ts\\""/);
    assert.match(packageJson, /"verify": "npm run lint && npm run typecheck && npm run eval && npm run build"/);
  });

  it('is the same suite CI runs', () => {
    const ci = readRepoFile('.github/workflows/ci.yml');
    assert.match(ci, /- run: npm run eval/);
    assert.match(ci, /- run: npm run typecheck/);
    assert.match(ci, /- run: npm run lint/);
  });

  it('contains every eval file on disk, and enough of them to mean something', () => {
    const files = suiteFiles();
    assert.ok(
      files.length >= 45,
      `the suite has shrunk to ${files.length} files; a glob that stops matching is silent`,
    );
    for (const path of files) {
      assert.match(path, /^src\/eval\/[\w./-]+\.eval\.ts$/, path);
    }
    assert.equal(new Set(files).size, files.length);
  });
});

describe('every file in the suite', () => {
  const files = suiteFiles();

  it('asserts something', () => {
    for (const path of files) {
      const source = readRepoFile(path);
      assert.match(source, /\bit\(/, `${path} declares no test`);
      assert.match(source, /\bassert\./, `${path} asserts nothing`);
      assert.match(
        source,
        /from 'node:assert\/strict'/,
        `${path} must assert with node:assert/strict`,
      );
    }
  });

  it('declares a test for every describe block it opens', () => {
    for (const path of files) {
      const source = readRepoFile(path);
      const describes = (source.match(/\bdescribe\(/g) ?? []).length;
      const tests = (source.match(/\bit\(/g) ?? []).length;
      assert.ok(
        tests >= describes,
        `${path} has ${describes} describe blocks and ${tests} tests`,
      );
    }
  });
});
