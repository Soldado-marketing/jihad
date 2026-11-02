# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | F02 plain-language errors: draft PR #139 (branch `fix/plain-language-errors`), web 301/301, typecheck + build green. Before: F01 #138 (CI SUCCESS), E01 #137 (CI SUCCESS), #136 D02, #135 C03, #134 J07, #133 docs |
| CURRENT_TASK_ID | F03 — stabilise the intermittent `apps/api/test/deadline-reminders.test.mjs` (runs in the 44-file parallel CI batch on a shared DB) |
| EXACT_STEP_REACHED | F03 started: environment setup (API `npm ci` + build in the code worktree, disposable `postgres:18` container `maos-f03-pg`) and reading `scheduler.service.ts` / `jobs/deadline-reminders.job.ts`. Suspects: `assert.equal(await run(), 0)` asserts a GLOBAL `affected` count that other suites' concurrent tasks can raise; `runNow` outcome under a concurrent run. Open PRs from this plan: #133 docs, #134, #135, #136, #137, #138, #139 (owner decisions O9, O11–O16). Isolated demo stack stopped |
| CURRENT_BRANCH | `fix/plain-language-errors` (PR #139) in the code worktree; next `test/deadline-reminders-isolation` from `origin/main`; `docs/master-plan` (PR #133) for these files |
| WORKTREE | code: `~/Developer/MAOS/claude/.claude/worktrees/team-access-e01-2e2441` (from `origin/main` `de2ee1b`; untracked `graphify-out/` there is local tooling, never commit it). Docs: previous session scratchpad `plan-wt` on `docs/master-plan`. The main checkout `~/Developer/MAOS/claude` belongs to another session (branch `fix/client-scope-inheritance`) — do not touch |
| LAST_RELEVANT_COMMIT | F02 commit on `fix/plain-language-errors` (PR #139); F01 on `feat/invoice-table-mobile` (#138); E01 `7b70cfc` (#137); main `de2ee1b` (#131) |
| LAST_RELEVANT_PR | #139 draft (F02); #138 draft (F01, CI SUCCESS); #137 draft (E01, CI SUCCESS); #133 open (planning docs); #134 #135 #136 draft; #109, #110, #120 open (owner decisions) |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md` (F01 CI green, F02 DONE awaiting merge, F03 IN_PROGRESS), `docs/MAOS_PROGRESS.md` (F02 entry, O16), `docs/MAOS_RESUME.md` |
| TESTS_COMPLETED | F02: web typecheck, `next build`, 301/301 (incl. `plain-language-errors` 10/10). F01: 296/296 + CI SUCCESS. E01 `7b70cfc`: 301/301 + CI SUCCESS. On `de2ee1b`: API unit 401/401, integration 35/35 + 458/458, web 291/291, production smoke 34/34 |
| TESTS_PENDING | CI on #139 (pending at checkpoint; fix only if red); F03 reproduction run |
| PRODUCTION | `jihad` + `maos-web` SUCCESS on `de2ee1b`; readiness 200; last verified 2026-11-03 (this session); bucket 0 objects |
| KNOWN_BLOCKERS | Owner decisions O1–O16 in `docs/MAOS_PROGRESS.md`; none blocks F03, M01–M04, E03, E05 |
| EXACT_NEXT_ACTION | 1) Check CI on #139 (fix only if red). 2) F03 on branch `test/deadline-reminders-isolation` from `origin/main`: build the API, run `deadline-reminders` together with `scheduler`, `notification-writers`, `my-work`, `approval-decisions` and other task-creating suites against the disposable PG18 (`MAOS_INTEGRATION=1`, fictional `JWT_SECRET`) 20 times; make the test tenant-scoped (never assert the global `affected`, tolerate a concurrent `runNow`), or scope the job result if the test cannot; 20 consecutive parallel runs clean; draft PR; remove the container afterwards. 3) Then M01–M04, one branch + draft PR each. 4) Keep these three files current at every boundary and push to #133 |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| LAST_UPDATED | 2026-11-03 02:40Z |
