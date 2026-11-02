# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | E01 Team & Access: web on draft PR #137 (branch `feat/team-access`, worktree `.claude/worktrees/team-access-e01-2e2441`), web 301/301, typecheck + build green. Earlier: #136 D02, #135 C03, #134 J07, #133 docs |
| CURRENT_TASK_ID | F01 — invoice table responsive at 375 px (`/invoices` i.e. `/finance/invoices`, and `/client/invoices`) |
| EXACT_STEP_REACHED | F01 not started. E01 PR #137 opened as draft, CI pending at checkpoint. Open PRs from this plan: #133 docs, #134 J07, #135 C03, #136 D02, #137 E01 (all draft/unmerged except #133; owner decisions O9, O11, O12, O13, O14). Isolated stack stopped |
| CURRENT_BRANCH | `feat/team-access` (PR #137) for code; `docs/master-plan` (PR #133) for these files |
| WORKTREE | code: `~/Developer/MAOS/claude/.claude/worktrees/team-access-e01-2e2441` (from `origin/main` `de2ee1b`; untracked `graphify-out/` there is local tooling, never commit it). Docs: previous session scratchpad `plan-wt` on `docs/master-plan`. The main checkout `~/Developer/MAOS/claude` belongs to another session (branch `fix/client-scope-inheritance`) — do not touch |
| LAST_RELEVANT_COMMIT | `7b70cfc` on `feat/team-access` (E01); main `de2ee1b` (#131) |
| LAST_RELEVANT_PR | #137 draft (E01); #133 open (planning docs); #134 #135 #136 draft; #109, #110, #120 open (owner decisions) |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md` (E01 DONE awaiting merge, F01 IN_PROGRESS), `docs/MAOS_PROGRESS.md` (E01 entry, O14), `docs/MAOS_RESUME.md` |
| TESTS_COMPLETED | E01 on `7b70cfc`: web typecheck, `next build`, 301/301 (incl. `team-access` 10/10). On `de2ee1b`: API unit 401/401, integration 35/35 + 458/458, web 291/291, main CI SUCCESS, production smoke 34/34 |
| TESTS_PENDING | CI on #137 (pending at checkpoint; fix only if red) |
| PRODUCTION | `jihad` + `maos-web` SUCCESS on `de2ee1b`; readiness 200; last verified 2026-11-03 (this session); bucket 0 objects |
| KNOWN_BLOCKERS | Owner decisions O1–O14 in `docs/MAOS_PROGRESS.md`; none blocks F01–F03, M01–M04, E03, E05 |
| EXACT_NEXT_ACTION | 1) Check CI on #137 (fix only if red). 2) F01 on branch `feat/invoice-table-mobile` from `origin/main`: find the invoice tables (`apps/web/app/(workspace)/finance/invoices`, `apps/web/app/(client)/client/invoices`, components under `src/components/finance` / `client-portal`); at 375 px no horizontal overflow — card layout under `md`, table from `md` up; web test for the responsive class set; agent-browser or build check; draft PR. 3) Then F02, F03 → M01–M04, one branch + draft PR each. 4) Keep these three files current at every boundary and push to #133 |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| LAST_UPDATED | 2026-11-03 01:30Z |
