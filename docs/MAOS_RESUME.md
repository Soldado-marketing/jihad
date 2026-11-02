# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | B03 design + rehearsal PASS (456/458 as `maos_app`, expected 2 test-only DDL failures); B05 inventory; planning files on PR #133 |
| CURRENT_TASK_ID | J06 — multi-company verification probes (next READY task; Phase 1 rows left are all owner-gated) |
| EXACT_STEP_REACHED | J06 not started. Isolated stack is stopped (`docker start maos-demo-pg maos-try-minio`, API 3212 / web 3230 from `fu-wt` or a `main` checkout) |
| CURRENT_BRANCH | `docs/master-plan` (PR #133, docs only, open) |
| WORKTREE | session scratchpad `plan-wt` (from `origin/main` `de2ee1b`); code worktree for tests `fu-wt` (`feat/client-portal-v2-followup`, clean, merged). The main checkout `~/Developer/MAOS/claude` belongs to another session (branch `fix/client-scope-inheritance`, untracked files) — do not touch |
| LAST_RELEVANT_COMMIT | main `de2ee1b` (#131) |
| LAST_RELEVANT_PR | #133 open (planning docs); #109, #110, #120 open (owner decisions) |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md`, `docs/MAOS_PROGRESS.md`, `docs/MAOS_RESUME.md` (new); `docs/security/postgres-least-privilege-plan.md` (new); `docs/MAOS_EXECUTION_LEDGER.md` (capsule points here) |
| TESTS_COMPLETED | On `de2ee1b`: API unit 401/401, integration 35/35 + 458/458, web 291/291, main CI SUCCESS, production smoke 34/34 |
| TESTS_PENDING | none (B03 rehearsal recorded in PROGRESS) |
| PRODUCTION | `jihad` + `maos-web` SUCCESS on `de2ee1b`; readiness 200; last verified 2026-11-02 16:30Z; bucket 0 objects |
| KNOWN_BLOCKERS | Owner decisions O1–O10 in `docs/MAOS_PROGRESS.md`; none blocks the B03 rehearsal, C03, E03, E05, F01–F03, J06, M01–M04 |
| EXACT_NEXT_ACTION | 1) J06: start the isolated stack from `main`, seed a second fictional company, probe: stale JWT after company switch, direct IDs across companies (projects, files, invoices, deliveries, complaints), cached list pages, notifications; record a PASS/FAIL matrix in PROGRESS; gaps become tasks. 2) Then Phase 3 in order C03 → D02 → E01 → F01–F03 → M01–M04, one branch + PR each from `origin/main`. 3) Keep these three files current at every boundary and push to #133 (or a follow-up docs PR once #133 is merged) |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| LAST_UPDATED | 2026-11-02 17:30Z |
