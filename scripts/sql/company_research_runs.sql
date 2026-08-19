-- Operator-applied DDL for company research run persistence.
-- Not run by CI. Apply manually against Neon when enabling research writes.

CREATE TABLE IF NOT EXISTS company_research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies (id),
  status text NOT NULL CHECK (status IN ('complete', 'partial', 'failed')),
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_research_runs_company_id_idx
  ON company_research_runs (company_id);

CREATE INDEX IF NOT EXISTS company_research_runs_company_finished_idx
  ON company_research_runs (company_id, finished_at DESC);
