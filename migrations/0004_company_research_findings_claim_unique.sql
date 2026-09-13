-- One claim per run, source, and field.
--
-- Applied by a human. This repository runs no migrations and the agent loop
-- never touches a database; the file exists so the identity dedupeFindings
-- enforces in src/lib/research/run.ts is reviewable, and held, in the schema
-- rather than only in application code. The coverage summary on the company
-- page counts claims, so a duplicate row would overstate what is known.
--
-- The key is (run_id, source, field) and not (company_id, source, field):
-- run_id already determines the company, and a claim is scoped to the run that
-- observed it. company_id is deliberately not part of the key, because that
-- would let one run hold the same claim twice under two company ids.
--
-- Before apply: confirm no duplicate claims exist, e.g.
--   SELECT run_id, source, field, COUNT(*) FROM company_research_findings
--   GROUP BY run_id, source, field HAVING COUNT(*) > 1;
-- A unique index create fails if duplicates are present. Removing rows is a
-- decision for whoever applies this, so this file deletes nothing.

CREATE UNIQUE INDEX IF NOT EXISTS company_research_findings_claim_uidx
  ON company_research_findings (run_id, source, field);
