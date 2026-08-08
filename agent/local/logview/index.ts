#!/usr/bin/env node
/**
 * Reader for the continuation event stream. All I/O lives here; the parsing,
 * folding, and rendering it calls are pure and covered by evals.
 *
 *   npm run logs                 recent runs
 *   npm run logs -- run <id>     one run in detail
 *   npm run logs -- feature <id> every run that touched a feature
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { parseEvents } from './events';
import { renderFeatureHistory, renderRunList, renderRunTimeline } from './report';
import { runsForFeature, summariseRun, summariseRuns } from './model';

const LOG_DIR = join(process.cwd(), 'agent/brain/logs');
const LOOP_LOG = join(LOG_DIR, 'loop.jsonl');
const RUNS_DIR = join(LOG_DIR, 'runs');

const readIfPresent = (path: string): string => (existsSync(path) ? readFileSync(path, 'utf8') : '');

/** The loop log holds run-level events; per-run files hold everything. */
function allRunEvents() {
  if (!existsSync(RUNS_DIR)) return [];
  return readdirSync(RUNS_DIR).flatMap((runId) => parseEvents(readIfPresent(join(RUNS_DIR, runId, 'events.jsonl'))));
}

function main(): number {
  const [command, argument] = process.argv.slice(2);

  if (!existsSync(LOG_DIR)) {
    console.log('No harness logs yet. Run `npm run watch` and merge something to main.');
    return 0;
  }

  if (!command) {
    const events = parseEvents(readIfPresent(LOOP_LOG));
    console.log(renderRunList(summariseRuns(events.length ? events : allRunEvents())));
    return 0;
  }

  if (command === 'run') {
    if (!argument) {
      console.error('usage: npm run logs -- run <run-id>');
      return 2;
    }
    const events = parseEvents(readIfPresent(join(RUNS_DIR, argument, 'events.jsonl')));
    if (events.length === 0) {
      console.error(`No events for run "${argument}".`);
      return 1;
    }
    console.log(renderRunTimeline(events, summariseRun(events)));
    return 0;
  }

  if (command === 'feature') {
    if (!argument) {
      console.error('usage: npm run logs -- feature <feature-id>');
      return 2;
    }
    console.log(renderFeatureHistory(runsForFeature(summariseRuns(allRunEvents()), argument), argument));
    return 0;
  }

  console.error(`Unknown command "${command}". Expected no argument, "run", or "feature".`);
  return 2;
}

process.exit(main());
