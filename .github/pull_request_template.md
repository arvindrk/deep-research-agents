### What and why

_What does this PR change, and what problem does it solve?_

---

### Type

- [ ] Bugfix
- [ ] New feature
- [ ] Refactor (no behaviour change)
- [ ] Breaking change
- [ ] Infra / DX / harness

---

### Verification

- [ ] `npm run verify` passes locally
- [ ] CI green
- [ ] No new dependencies (or: justified below, with the lockfile diff reviewed)

_Commands run and their results:_

---

### Database (if the PR touches SQL, schema, or indexes)

- **Query or endpoint:**
- **`EXPLAIN ANALYZE` output:**
- [ ] Index used, no unexpected sequential scan
- [ ] Pagination or limits applied
- [ ] No N+1
- [ ] All values passed as parameters, never interpolated into SQL

---

### Additional context

_Screenshots for UI changes. Links to the plan, feature id, or issue._
