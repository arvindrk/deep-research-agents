-- Research runs and the findings they produced.
--
-- Applied by a human. This repository runs no migrations and the agent loop
-- never touches a database; the file exists so the queries in
-- src/db/queries/research.ts have a schema they can be read against, and so the
-- shape is reviewable before anything is applied.
--
-- company_id is text and carries no foreign key on purpose: nothing in this
-- repository asserts the type of companies.id, and a wrong REFERENCES clause
-- fails at apply time for everyone. Add the constraint once the type is known.

CREATE TABLE IF NOT EXISTS company_research_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  text NOT NULL,
  status      text NOT NULL CHECK (status IN ('complete', 'partial', 'failed')),
  attempted   text[] NOT NULL DEFAULT '{}',
  succeeded   text[] NOT NULL DEFAULT '{}',
  failed      jsonb NOT NULL DEFAULT '[]'::jsonb,
  observed_at timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_research_runs_company_observed_idx
  ON company_research_runs (company_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS company_research_findings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       uuid NOT NULL REFERENCES company_research_runs (id) ON DELETE CASCADE,
  company_id   text NOT NULL,
  source       text NOT NULL,
  field        text NOT NULL,
  value        text NOT NULL,
  evidence_url text,
  confidence   text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  observed_at  timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_research_findings_company_field_idx
  ON company_research_findings (company_id, field, observed_at DESC);
