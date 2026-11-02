# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | D02 client work requests: API + web on draft PR #136 (branch `feat/client-work-requests`, worktree `d02-wt`), gates 20/20, web 291/291. Earlier today: #134 J07, #135 C03, #133 docs |
| CURRENT_TASK_ID | E01 — one Team & Access experience (Members, Invitations, Company Access, User Requests) |
| EXACT_STEP_REACHED | E01 not started. Open PRs from this plan: #133 docs, #134 J07, #135 C03, #136 D02 (all draft/unmerged; owner decisions O9, O11, O12, O13). Isolated stack is stopped (`docker start maos-demo-pg maos-try-minio`; API: `source scratchpad/demo/env.sh; PORT=3212 node dist/main.js` from `fu-wt/apps/api`) |
| CURRENT_BRANCH | `docs/master-plan` (PR #133, docs only, open) |
| WORKTREE | session scratchpad `plan-wt` (from `origin/main` `de2ee1b`); code worktree for tests `fu-wt` (`feat/client-portal-v2-followup`, clean, merged). The main checkout `~/Developer/MAOS/claude` belongs to another session (branch `fix/client-scope-inheritance`, untracked files) — do not touch |
| LAST_RELEVANT_COMMIT | main `de2ee1b` (#131) |
| LAST_RELEVANT_PR | #133 open (planning docs); #109, #110, #120 open (owner decisions) |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md`, `docs/MAOS_PROGRESS.md`, `docs/MAOS_RESUME.md` (new); `docs/security/postgres-least-privilege-plan.md` (new); `docs/MAOS_EXECUTION_LEDGER.md` (capsule points here) |
| TESTS_COMPLETED | On `de2ee1b`: API unit 401/401, integration 35/35 + 458/458, web 291/291, main CI SUCCESS, production smoke 34/34 |
| TESTS_PENDING | none (B03 rehearsal recorded in PROGRESS) |
| PRODUCTION | `jihad` + `maos-web` SUCCESS on `de2ee1b`; readiness 200; last verified 2026-11-02 16:30Z; bucket 0 objects |
| KNOWN_BLOCKERS | Owner decisions O1–O10 in `docs/MAOS_PROGRESS.md`; none blocks the B03 rehearsal, C03, E03, E05, F01–F03, J06, M01–M04 |
| EXACT_NEXT_ACTION | 1) Check CI on #134, #135, #136 (bound in the app; fix only if red). 2) E01 on branch `feat/team-access` from `origin/main`: inspect `/admin-users`, `/admin/invites`, `/company-access` and the members page (#126) in `apps/web`; one route `/team` with tabs that render the existing components; old routes redirect; no API or permission change; web tests for nav slot + tabs; draft PR. 3) Then F01–F03 → M01–M04, one branch + PR each. 4) Keep these three files current at every boundary and push to #133 (or a follow-up docs PR once #133 is merged) |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| LAST_UPDATED | 2026-11-03 00:30Z |
