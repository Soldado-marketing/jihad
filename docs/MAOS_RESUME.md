# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | F03 deadline-reminders test isolation: draft PR #140 (branch `test/deadline-reminders-isolation`), full batch 20/20 clean. Before: F02 #139 (CI SUCCESS), F01 #138 (CI SUCCESS), E01 #137 (CI SUCCESS), #136 D02, #135 C03, #134 J07, #133 docs |
| CURRENT_TASK_ID | M01 — menu structure and role visibility audit table (docs only), then M02 regroup |
| EXACT_STEP_REACHED | M01 started: audit table drafted from `navigation.ts` + `sidebar.tsx` (items, roles, group today → target group, per-role view); to be written to `docs/` on branch `docs/navigation-audit-m01` with a draft PR. Open PRs from this plan: #133 docs, #134, #135, #136, #137, #138, #139, #140 (owner decisions O9, O11–O17). Isolated demo stack stopped; F03 container removed |
| CURRENT_BRANCH | `test/deadline-reminders-isolation` (PR #140) in the code worktree; next `docs/navigation-audit-m01`; `docs/master-plan` (PR #133) for these files |
| WORKTREE | code: `~/Developer/MAOS/claude/.claude/worktrees/team-access-e01-2e2441` (from `origin/main` `de2ee1b`; untracked `graphify-out/` there is local tooling, never commit it). Docs: previous session scratchpad `plan-wt` on `docs/master-plan`. The main checkout `~/Developer/MAOS/claude` belongs to another session (branch `fix/client-scope-inheritance`) — do not touch |
| LAST_RELEVANT_COMMIT | F03 commit on `test/deadline-reminders-isolation` (PR #140); F02 (#139); F01 (#138); E01 `7b70cfc` (#137); main `de2ee1b` (#131) |
| LAST_RELEVANT_PR | #140 draft (F03); #139 draft (F02, CI SUCCESS); #138 draft (F01, CI SUCCESS); #137 draft (E01, CI SUCCESS); #133 open (planning docs); #134 #135 #136 draft; #109, #110, #120 open (owner decisions) |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md` (F02 CI green, F03 DONE awaiting merge, M01 IN_PROGRESS), `docs/MAOS_PROGRESS.md` (F03 entry, O17), `docs/MAOS_RESUME.md` |
| TESTS_COMPLETED | F03: suite 5/5, full 44-file batch 20× 459/459 on disposable PG18. F02: web 301/301 + CI SUCCESS. F01: 296/296 + CI SUCCESS. E01: 301/301 + CI SUCCESS. On `de2ee1b`: API unit 401/401, integration 35/35 + 458/458, web 291/291, production smoke 34/34 |
| TESTS_PENDING | CI on #140 (pending at checkpoint; fix only if red) |
| PRODUCTION | `jihad` + `maos-web` SUCCESS on `de2ee1b`; readiness 200; last verified 2026-11-03 (this session); bucket 0 objects |
| KNOWN_BLOCKERS | Owner decisions O1–O17 in `docs/MAOS_PROGRESS.md`; none blocks M01–M04, E03, E05 |
| EXACT_NEXT_ACTION | 1) Check CI on #140 (fix only if red). 2) M01 on branch `docs/navigation-audit-m01` from `origin/main`: write `docs/ux/NAVIGATION_AUDIT.md` (item → route → roles → group today → target group; per-role view; constraints from ops-dashboard, sprint-4, sprint-7, compact-navigation tests); draft PR. 3) M02 on `feat/sidebar-regroup`: `navGroups` in `sidebar.tsx` only (Workspace · Company & Team · Projects & Delivery · Customers & CRM · Finance & Banking · Reports · Settings; AI Assistant only when L ships), routes and `allowedRoles` untouched, web tests (every id has a slot, no duplicates, CLIENT sees none); then M03, M04. 4) Keep these three files current at every boundary and push to #133 |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| LAST_UPDATED | 2026-11-03 03:30Z |
