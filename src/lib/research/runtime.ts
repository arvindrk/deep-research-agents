import { buildResearchRun, type ResearchRun } from './run';
import type {
  ResearchFinding,
  ResearchSourceId,
  ResearchSubject,
  SourceOutcome,
} from './types';
import { collectCareersFindings } from './careers';
import { collectWebsiteFindings } from './website';

/** Bounded so a failing source cannot write an essay into the run record. */
const MAX_ERROR_CHARS = 200;

export type ResearchCollector = {
  source: ResearchSourceId;
  collect: (
    subject: ResearchSubject,
    observedAt: string,
  ) => Promise<ResearchFinding[]>;
};

const sourceError = (error: unknown): string =>
  (error instanceof Error ? error.message : 'source failed').slice(
    0,
    MAX_ERROR_CHARS,
  );

/**
 * Runs every collector for one company, isolating failures: a source that
 * throws makes the run partial rather than stopping the others or discarding
 * what they found.
 *
 * Sequential on purpose. One company, one source at a time is a concurrency
 * bound a caller cannot accidentally exceed, and enrichment is not latency
 * sensitive.
 */
export async function runResearch(
  subject: ResearchSubject,
  collectors: readonly ResearchCollector[],
  observedAt: string,
): Promise<ResearchRun> {
  const outcomes: SourceOutcome[] = [];

  for (const collector of collectors) {
    try {
      outcomes.push({
        status: 'ok',
        source: collector.source,
        findings: await collector.collect(subject, observedAt),
      });
    } catch (error) {
      outcomes.push({
        status: 'failed',
        source: collector.source,
        error: sourceError(error),
      });
    }
  }

  return buildResearchRun(subject.id, outcomes, observedAt);
}

/** What the runner asks when no collector list is given. */
export const DEFAULT_COLLECTORS: readonly ResearchCollector[] = [
  { source: 'website', collect: collectWebsiteFindings },
  { source: 'careers', collect: collectCareersFindings },
];
