import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const REPO_ROOT = process.cwd();
const STATUSES = ['pending', 'in_progress', 'completed', 'blocked'] as const;

type Feature = {
  id: string;
  status: (typeof STATUSES)[number];
  priority: number;
  category: string;
  depends_on: string[];
  description: string;
  verify: string;
  passes: boolean;
};

const load = <T>(path: string): T => JSON.parse(readFileSync(join(REPO_ROOT, path), 'utf8')) as T;

const features = load<Feature[]>('agent/feature_list.json');
const categories = load<{ categories: { id: string; weight: number }[] }>('agent/categories.json');
const horizon = load<{ slice: string[]; rationale_per_step: Record<string, string> }>(
  'agent/harness/horizon.json',
);
const config = load<Record<string, unknown>>('agent/harness-config.json');

const byId = new Map(features.map((feature) => [feature.id, feature]));

/** Returns a dependency cycle as a readable path, or null when the graph is acyclic. */
function findCycle(): string | null {
  const visiting = new Set<string>();
  const done = new Set<string>();

  const walk = (id: string, path: string[]): string | null => {
    if (visiting.has(id)) return [...path, id].join(' -> ');
    if (done.has(id)) return null;

    visiting.add(id);
    for (const dependency of byId.get(id)?.depends_on ?? []) {
      const cycle = walk(dependency, [...path, id]);
      if (cycle) return cycle;
    }
    visiting.delete(id);
    done.add(id);
    return null;
  };

  for (const feature of features) {
    const cycle = walk(feature.id, []);
    if (cycle) return cycle;
  }
  return null;
}

describe('feature list', () => {
  it('is a non-empty array', () => {
    assert.ok(Array.isArray(features) && features.length > 0);
  });

  it('gives every feature every required field, correctly typed', () => {
    for (const feature of features) {
      const where = `feature ${feature.id ?? '(missing id)'}`;
      assert.equal(typeof feature.id, 'string', `${where}: id must be a string`);
      assert.ok(feature.id.length > 0, `${where}: id must not be empty`);
      assert.ok(STATUSES.includes(feature.status), `${where}: status "${feature.status}" is not one of ${STATUSES.join(', ')}`);
      assert.ok(Number.isInteger(feature.priority), `${where}: priority must be an integer`);
      assert.ok(Array.isArray(feature.depends_on), `${where}: depends_on must be an array`);
      assert.ok(feature.description?.length > 20, `${where}: description is too thin to plan from`);
      assert.ok(feature.verify?.length > 0, `${where}: verify must be a runnable command`);
      assert.equal(typeof feature.passes, 'boolean', `${where}: passes must be a boolean`);
    }
  });

  it('keeps ids unique', () => {
    const ids = features.map((feature) => feature.id);
    assert.deepEqual(ids, [...new Set(ids)], 'duplicate feature id: the planner would select ambiguously');
  });

  it('keeps priorities unique', () => {
    const priorities = features.map((feature) => feature.priority);
    assert.deepEqual(priorities, [...new Set(priorities)], 'duplicate priority: selection order would be non-deterministic');
  });

  it('uses only categories declared in categories.json', () => {
    const known = new Set(categories.categories.map((category) => category.id));
    for (const feature of features) {
      assert.ok(known.has(feature.category), `feature ${feature.id} has unknown category "${feature.category}"`);
    }
  });

  it('resolves every dependency', () => {
    for (const feature of features) {
      for (const dependency of feature.depends_on) {
        assert.ok(byId.has(dependency), `feature ${feature.id} depends on "${dependency}", which does not exist`);
      }
    }
  });

  it('has no dependency cycle', () => {
    const cycle = findCycle();
    assert.equal(cycle, null, `dependency cycle would deadlock the planner: ${cycle}`);
  });

  it('never marks a feature completed while a dependency is unfinished', () => {
    for (const feature of features.filter((f) => f.status === 'completed')) {
      for (const dependency of feature.depends_on) {
        assert.equal(
          byId.get(dependency)?.status,
          'completed',
          `feature ${feature.id} is completed but depends on unfinished "${dependency}"`,
        );
      }
    }
  });
});

describe('categories', () => {
  it('has weights summing to 1', () => {
    const total = categories.categories.reduce((sum, category) => sum + category.weight, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `category weights sum to ${total}, not 1`);
  });

  it('keeps category ids unique', () => {
    const ids = categories.categories.map((category) => category.id);
    assert.deepEqual(ids, [...new Set(ids)]);
  });
});

describe('horizon', () => {
  it('references only real features', () => {
    for (const id of horizon.slice) {
      assert.ok(byId.has(id), `horizon references "${id}", which is not in the feature list`);
    }
  });

  it('does not schedule finished work', () => {
    for (const id of horizon.slice) {
      assert.notEqual(byId.get(id)?.status, 'completed', `horizon still schedules completed feature "${id}"`);
    }
  });

  it('explains every step it schedules', () => {
    for (const id of horizon.slice) {
      assert.ok(horizon.rationale_per_step[id]?.length > 0, `horizon step "${id}" has no rationale`);
    }
  });

  it('stays short enough to be a lookahead rather than a plan', () => {
    assert.ok(horizon.slice.length >= 1 && horizon.slice.length <= 5, `horizon has ${horizon.slice.length} steps, expected 1 to 5`);
  });
});

describe('harness config', () => {
  it('declares every field the orchestration layer reads', () => {
    for (const key of [
      'gh_repo',
      'display_name',
      'base_branch',
      'agent_cmd',
      'agent_model',
      'branch_prefix',
      'watch_interval_seconds',
      'max_inflight_prs',
      'min_commits_per_pr',
      'max_files_changed',
      'max_lines_changed',
    ]) {
      assert.ok(key in config, `harness-config.json is missing "${key}"`);
    }
  });

  it('keeps every limit a positive number', () => {
    for (const key of [
      'watch_interval_seconds',
      'max_inflight_prs',
      'min_commits_per_pr',
      'max_files_changed',
      'max_lines_changed',
    ]) {
      const value = config[key];
      assert.ok(typeof value === 'number' && value > 0, `harness-config.json "${key}" must be a positive number`);
    }
  });

  it('holds no secret-shaped value', () => {
    const serialised = JSON.stringify(config);
    assert.doesNotMatch(serialised, /postgres:\/\/|postgresql:\/\/|gh[pousr]_|sk-|-----BEGIN/, 'harness-config.json looks like it contains a credential');
  });
});
