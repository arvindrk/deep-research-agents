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

/**
 * Ways a test can stop being a test without anyone noticing. `.only` is the
 * dangerous one: node:test runs only the marked tests in that file and reports
 * the rest as skipped, so one stray `.only` turns a green suite into a green
 * single test.
 */
const SILENCERS = [
  { name: 'an exclusive test', pattern: /\b(?:it|test|describe)\.only\s*\(/ },
  { name: 'a skipped test', pattern: /\b(?:it|test|describe)\.skip\s*\(/ },
  { name: 'a todo test', pattern: /\b(?:it|test)\.todo\s*\(/ },
  { name: 'a skip option', pattern: /\bskip:\s*(?:true|')/ },
  { name: 'a todo option', pattern: /\btodo:\s*(?:true|')/ },
  { name: 'a commented-out assertion', pattern: /^\s*\/\/\s*assert\./m },
] as const;

describe('nothing in the suite is silenced', () => {
  it('has no exclusive, skipped, or todo test', () => {
    for (const path of suiteFiles()) {
      const source = readRepoFile(path);
      for (const silencer of SILENCERS) {
        assert.doesNotMatch(source, silencer.pattern, `${path} contains ${silencer.name}`);
      }
    }
  });

  it('checks for the silencers it can actually detect', () => {
    // The scan is only as good as its patterns, so prove each one fires.
    // Assembled, never spelled: a literal sample would make this file trip
    // its own scan, and excluding the file from the scan is how a stray
    // silencer would get in here unnoticed.
    const marker = (name: string, suffix: string) => name + '.' + suffix;
    const option = (name: string, value: string) => name + ': ' + value;
    const samples = [
      marker('it', 'only') + "('x', () => {});",
      marker('describe', 'skip') + "('x', () => {});",
      marker('it', 'todo') + "('x');",
      "it('x', { " + option('skip', 'true') + ' }, () => {});',
      "it('x', { " + option('todo', "'later'") + ' }, () => {});',
      '// assert' + '.equal(1, 2);',
    ];
    samples.forEach((sample, at) => {
      assert.match(sample, SILENCERS[at].pattern, sample);
    });
    assert.equal(samples.length, SILENCERS.length);
  });
});
