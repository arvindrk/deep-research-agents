import type {
  ResearchFinding,
  ResearchSourceId,
  SourceOutcome,
} from './types';

export type ResearchRunStatus = 'complete' | 'partial' | 'failed';

export type ResearchSourceFailure = {
  source: ResearchSourceId;
  error: string;
};

export type ResearchRun = {
  company_id: string;
  status: ResearchRunStatus;
  attempted: ResearchSourceId[];
  succeeded: ResearchSourceId[];
  failed: ResearchSourceFailure[];
  findings: ResearchFinding[];
  observed_at: string;
};

/**
 * A claim's identity: which source said it, and about what. Source is part of
 * the key so `website_title` and `careers_title` are never confused, and two
 * sources reporting the same field name both survive.
 */
const findingKey = (finding: ResearchFinding): string =>
  `${finding.source}\u0000${finding.field}`;

/**
 * The same claim twice is not two claims. A reader would see it twice and the
 * coverage measure would count it twice, so the repeat is dropped where the
 * sources are folded together, before anything is written.
 *
 * First wins: the result must not depend on how a caller ordered its
 * collectors.
 */
export function dedupeFindings(
  findings: readonly ResearchFinding[],
): ResearchFinding[] {
  const seen = new Set<string>();
  const kept: ResearchFinding[] = [];

  for (const finding of findings) {
    const key = findingKey(finding);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(finding);
  }

  return kept;
}

/**
 * Complete only when every attempted source succeeded. Nothing else is ever
 * called complete: a partial result that reads as complete is worse than no
 * result, because a reader stops looking for the rest.
 */
export function runStatus(
  outcomes: readonly SourceOutcome[],
): ResearchRunStatus {
  if (outcomes.length === 0) {
    return 'failed';
  }

  const failures = outcomes.filter(
    (outcome) => outcome.status === 'failed',
  ).length;

  if (failures === 0) return 'complete';
  return failures === outcomes.length ? 'failed' : 'partial';
}

/** Folds per-source outcomes into the record that gets persisted. */
export function buildResearchRun(
  companyId: string,
  outcomes: readonly SourceOutcome[],
  observedAt: string,
): ResearchRun {
  return {
    company_id: companyId,
    status: runStatus(outcomes),
    attempted: outcomes.map((outcome) => outcome.source),
    succeeded: outcomes
      .filter((outcome) => outcome.status === 'ok')
      .map((outcome) => outcome.source),
    failed: outcomes
      .filter(
        (outcome): outcome is Extract<SourceOutcome, { status: 'failed' }> =>
          outcome.status === 'failed',
      )
      .map((outcome) => ({ source: outcome.source, error: outcome.error })),
    findings: dedupeFindings(
      outcomes.flatMap((outcome) =>
        outcome.status === 'ok' ? outcome.findings : [],
      ),
    ),
    observed_at: observedAt,
  };
}
