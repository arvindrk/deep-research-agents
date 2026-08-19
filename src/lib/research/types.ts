/** Outcome of one enrichment step for a company. */
export type EnrichmentStepResult =
  | {
      stepId: string;
      required: boolean;
      ok: true;
      data: Record<string, unknown>;
    }
  | {
      stepId: string;
      required: boolean;
      ok: false;
      error: string;
    };

/** Explicit run status. Partial must never be read as complete. */
export type ResearchRunStatus = 'complete' | 'partial' | 'failed';

export type ResearchContext = {
  companyId: string;
  name: string;
  oneLiner: string | null;
  longDescription: string | null;
  website: string | null;
  tags: readonly string[];
  industries: readonly string[];
  regions: readonly string[];
};

export type EnrichmentStepOutcome =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

export type EnrichmentStep = {
  id: string;
  required: boolean;
  enrich: (ctx: ResearchContext) => Promise<EnrichmentStepOutcome>;
};

export type ResearchRun = {
  companyId: string;
  status: ResearchRunStatus;
  steps: EnrichmentStepResult[];
  output: Record<string, unknown>;
};
