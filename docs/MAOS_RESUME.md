# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | F01 invoice list on mobile: draft PR #138 (branch `feat/invoice-table-mobile`), web 296/296, typecheck + build green. Before: E01 #137 (CI SUCCESS), #136 D02, #135 C03, #134 J07, #133 docs |
| CURRENT_TASK_ID | F02 — plain-language error and access-denied messages (map 401/403/404/409 in `apps/web/src/lib/fetch.ts` callers; never leak internal names to CLIENT) |
| EXACT_STEP_REACHED | F02 not started (inspection of `src/lib/fetch.ts`, `denied-state`, `app/not-found.tsx` begun). Open PRs from this plan: #133 docs, #134 J07, #135 C03, #136 D02, #137 E01, #138 F01 (owner decisions O9, O11–O15). Isolated stack stopped |
| CURRENT_BRANCH | `feat/invoice-table-mobile` (PR #138) in the code worktree; `docs/master-plan` (PR #133) for these files |
| WORKTREE | code: `~/Developer/MAOS/claude/.claude/worktrees/team-access-e01-2e2441` (from `origin/main` `de2ee1b`; untracked `graphify-out/` there is local tooling, never commit it). Docs: previous session scratchpad `plan-wt` on `docs/master-plan`. The main checkout `~/Developer/MAOS/claude` belongs to another session (branch `fix/client-scope-inheritance`) — do not touch |
| LAST_RELEVANT_COMMIT | F01 commit on `feat/invoice-table-mobile` (see PR #138); E01 `7b70cfc`; main `de2ee1b` (#131) |
| LAST_RELEVANT_PR | #138 draft (F01); #137 draft (E01, CI SUCCESS); #133 open (planning docs); #134 #135 #136 draft; #109, #110, #120 open (owner decisions) |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md` (E01 CI green, F01 DONE awaiting merge, F02 IN_PROGRESS), `docs/MAOS_PROGRESS.md` (F01 entry, O15), `docs/MAOS_RESUME.md` |
| TESTS_COMPLETED | F01: web typecheck, `next build`, 296/296 (incl. `invoice-table-mobile` 5/5). E01 `7b70cfc`: 301/301 + CI SUCCESS. On `de2ee1b`: API unit 401/401, integration 35/35 + 458/458, web 291/291, production smoke 34/34 |
| TESTS_PENDING | CI on #138 (pending at checkpoint; fix only if red) |
| PRODUCTION | `jihad` + `maos-web` SUCCESS on `de2ee1b`; readiness 200; last verified 2026-11-03 (this session); bucket 0 objects |
| KNOWN_BLOCKERS | Owner decisions O1–O15 in `docs/MAOS_PROGRESS.md`; none blocks F02, F03, M01–M04, E03, E05 |
| EXACT_NEXT_ACTION | 1) Check CI on #138 (fix only if red). 2) F02 on branch `fix/plain-language-errors` from `origin/main`: one helper in `src/lib` that maps HTTP 401/403/404/409 (and network failure) to plain sentences; use it where `apiFetch` errors are shown (`err.message`); keep `SESSION_EXPIRED_MESSAGE`/`FORBIDDEN_MESSAGE` semantics; client-portal strings must pass the sprint-4 forbidden-word test (no admin/audit/reports/AI/payroll); web test per code; draft PR. 3) Then F03 → M01–M04, one branch + draft PR each. 4) Keep these three files current at every boundary and push to #133 |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| LAST_UPDATED | 2026-11-03 02:00Z |
