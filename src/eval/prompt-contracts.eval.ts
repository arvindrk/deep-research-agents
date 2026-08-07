import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const REPO_ROOT = process.cwd();

type Artifact = {
  written_by: string;
  path?: string;
  path_glob?: string;
  prompt: string;
  required_keys: string[];
  required_on_failure?: string;
};

type Contract = {
  tmp_dir: string;
  artifacts: Record<string, Artifact>;
  verdicts: string[];
  finding_severities: string[];
};

const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');
const contract = JSON.parse(read('agent/harness/artifacts.json')) as Contract;
const entries = Object.entries(contract.artifacts);

describe('artifact contract', () => {
  it('declares at least the three personas', () => {
    const authors = entries.map(([, artifact]) => artifact.written_by);
    for (const persona of ['planner', 'executor', 'validator']) {
      assert.ok(authors.includes(persona), `no artifact is written by the ${persona}`);
    }
  });

  it('points every artifact at a prompt that exists', () => {
    for (const [name, artifact] of entries) {
      assert.ok(existsSync(join(REPO_ROOT, artifact.prompt)), `artifact "${name}" names a missing prompt ${artifact.prompt}`);
    }
  });

  it('gives every artifact a location under the harness tmp directory', () => {
    for (const [name, artifact] of entries) {
      const location = artifact.path ?? artifact.path_glob;
      assert.ok(location, `artifact "${name}" declares neither path nor path_glob`);
      assert.ok(location.startsWith(contract.tmp_dir), `artifact "${name}" is written outside ${contract.tmp_dir}`);
    }
  });

  it('requires at least one key per artifact', () => {
    for (const [name, artifact] of entries) {
      assert.ok(artifact.required_keys.length > 0, `artifact "${name}" requires no keys, so nothing can be validated`);
    }
  });
});

describe('prompts describe the artifacts they must write', () => {
  for (const [name, artifact] of entries) {
    it(`${artifact.prompt} documents every key of "${name}"`, () => {
      const prompt = read(artifact.prompt);
      for (const key of artifact.required_keys) {
        assert.match(
          prompt,
          new RegExp(`\\b${key}\\b`),
          `${artifact.prompt} never mentions "${key}", but agent/local/continue.sh parses it. Prompt and wrapper have drifted.`,
        );
      }
    });

    it(`${artifact.prompt} states where "${name}" is written`, () => {
      const prompt = read(artifact.prompt);
      // For a glob, the prompt only has to name the fixed prefix; the suffix is a timestamp.
      const stem = artifact.path ?? (artifact.path_glob ?? '').split('*')[0];
      assert.ok(prompt.includes(stem), `${artifact.prompt} never names the path ${stem}`);
    });
  }
});

describe('prompt safety floor', () => {
  const prompts = entries.map(([, artifact]) => artifact.prompt);

  for (const prompt of [...new Set(prompts)]) {
    const body = read(prompt);

    it(`${prompt} forbids reading secrets`, () => {
      assert.match(body, /\.env/, `${prompt} does not tell the agent to stay out of .env files`);
    });

    it(`${prompt} treats external content as untrusted`, () => {
      assert.match(body, /untrusted/i, `${prompt} does not establish that external content is data, not instructions`);
    });

    it(`${prompt} withholds irreversible actions`, () => {
      assert.match(
        body,
        /do not (merge|push)|never (merge|push)/i,
        `${prompt} does not forbid merging or pushing`,
      );
    });
  }
});

describe('validator verdict contract', () => {
  const validatorPrompt = read(contract.artifacts.validation.prompt);

  it('defines the verdicts the wrapper switches on', () => {
    assert.deepEqual(contract.verdicts, ['pass', 'fail']);
    for (const verdict of contract.verdicts) {
      assert.match(validatorPrompt, new RegExp(`"?${verdict}"?`), `validator prompt never mentions the "${verdict}" verdict`);
    }
  });

  it('defines every finding severity', () => {
    for (const severity of contract.finding_severities) {
      assert.match(validatorPrompt, new RegExp(severity), `validator prompt never mentions severity "${severity}"`);
    }
  });

  it('makes a missing artifact fail closed', () => {
    const rule = contract.artifacts.validation.required_on_failure ?? '';
    assert.match(rule, /fail/i, 'a missing validation artifact must be treated as a failure, not a pass');
  });
});
