/** Sources the runtime knows how to ask. One entry per collector. */
export const RESEARCH_SOURCES = ['website'] as const;

export type ResearchSourceId = (typeof RESEARCH_SOURCES)[number];

export type FindingConfidence = 'high' | 'medium' | 'low';

/**
 * One enriched fact about a company, with where it came from and when it was
 * seen. `observed_at` is supplied by the caller rather than read from a clock
 * here, so a run is reproducible and the pure layer stays evaluable.
 */
export type ResearchFinding = {
  source: ResearchSourceId;
  field: string;
  value: string;
  evidence_url: string | null;
  observed_at: string;
  confidence: FindingConfidence;
};

/** What one source produced, or the fact that it could not produce anything. */
export type SourceOutcome =
  | { status: 'ok'; source: ResearchSourceId; findings: ResearchFinding[] }
  | { status: 'failed'; source: ResearchSourceId; error: string };

/** The company fields a collector is allowed to see. */
export type ResearchSubject = {
  id: string;
  name: string;
  website: string | null;
};
