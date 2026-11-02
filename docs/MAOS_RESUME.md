# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | J07 no-store default: draft PR #134 (branch `fix/api-no-store`, worktree `ns-wt`), unit gate 407/407, integration-api 39/39; awaiting CI + owner release approval (O11) |
| CURRENT_TASK_ID | C03 — supported formats review (PDF, images, Office, ZIP, video, links) |
| EXACT_STEP_REACHED | C03 not started. Start by reading `apps/api/src/modules/storage/file-type.ts` (allow-list + sniffing) and the files controller; produce the format → accepted → sniffed → preview/download table with a test per row. Isolated stack is stopped (`docker start maos-demo-pg maos-try-minio`; API: `source scratchpad/demo/env.sh; PORT=3212 node dist/main.js` from `fu-wt/apps/api`) |
| CURRENT_BRANCH | `docs/master-plan` (PR #133, docs only, open) |
| WORKTREE | session scratchpad `plan-wt` (from `origin/main` `de2ee1b`); code worktree for tests `fu-wt` (`feat/client-portal-v2-followup`, clean, merged). The main checkout `~/Developer/MAOS/claude` belongs to another session (branch `fix/client-scope-inheritance`, untracked files) — do not touch |
| LAST_RELEVANT_COMMIT | main `de2ee1b` (#131) |
| LAST_RELEVANT_PR | #133 open (planning docs); #109, #110, #120 open (owner decisions) |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md`, `docs/MAOS_PROGRESS.md`, `docs/MAOS_RESUME.md` (new); `docs/security/postgres-least-privilege-plan.md` (new); `docs/MAOS_EXECUTION_LEDGER.md` (capsule points here) |
| TESTS_COMPLETED | On `de2ee1b`: API unit 401/401, integration 35/35 + 458/458, web 291/291, main CI SUCCESS, production smoke 34/34 |
| TESTS_PENDING | none (B03 rehearsal recorded in PROGRESS) |
| PRODUCTION | `jihad` + `maos-web` SUCCESS on `de2ee1b`; readiness 200; last verified 2026-11-02 16:30Z; bucket 0 objects |
| KNOWN_BLOCKERS | Owner decisions O1–O10 in `docs/MAOS_PROGRESS.md`; none blocks the B03 rehearsal, C03, E03, E05, F01–F03, J06, M01–M04 |
| EXACT_NEXT_ACTION | 1) Check CI on #134 (bound in the app; fix only if red). 2) C03 review on a branch `docs/c03-formats` or inside the next code PR: format table + tests per row (`apps/api/test/*file-type*`), no behaviour change unless a gap is found. 3) Then D02 → E01 → F01–F03 → M01–M04, one branch + PR each from `origin/main`. 4) Keep these three files current at every boundary and push to #133 (or a follow-up docs PR once #133 is merged) |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| LAST_UPDATED | 2026-11-02 22:30Z |
