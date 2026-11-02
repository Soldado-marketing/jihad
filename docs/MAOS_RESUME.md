# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | M01 navigation audit: draft PR #141 (branch `docs/navigation-audit-m01`). Before: F03 #140, F02 #139, F01 #138, E01 #137 (CI SUCCESS on #137–#139), #136 D02, #135 C03, #134 J07, #133 docs |
| CURRENT_TASK_ID | M02 — regroup the sidebar into Workspace · Company & Team · Projects & Delivery · Customers & CRM · Finance & Banking · Reports · Settings (AI Assistant only when L ships); group-only change in `sidebar.tsx` |
| EXACT_STEP_REACHED | M02 not started (branch `feat/sidebar-regroup` from `origin/main` next). Mapping is in `docs/ux/MAOS_NAVIGATION_AUDIT_M01.md` on #141. Open PRs from this plan: #133 docs, #134–#141 (owner decisions O9, O11–O18) |
| CURRENT_BRANCH | `docs/navigation-audit-m01` (PR #141) in the code worktree; next `feat/sidebar-regroup`; `docs/master-plan` (PR #133) for these files |
| WORKTREE | code: `~/Developer/MAOS/claude/.claude/worktrees/team-access-e01-2e2441` (from `origin/main` `de2ee1b`; untracked `graphify-out/` there is local tooling, never commit it). Docs: previous session scratchpad `plan-wt` on `docs/master-plan`. The main checkout `~/Developer/MAOS/claude` belongs to another session (branch `fix/client-scope-inheritance`) — do not touch |
| LAST_RELEVANT_COMMIT | M01 commit on `docs/navigation-audit-m01` (PR #141); F03 (#140); F02 (#139); F01 (#138); E01 `7b70cfc` (#137); main `de2ee1b` (#131) |
| LAST_RELEVANT_PR | #141 draft (M01 docs); #140 draft (F03, API CI pending); #139 #138 #137 draft (CI SUCCESS); #133 open (planning docs); #134 #135 #136 draft; #109, #110, #120 open (owner decisions) |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md` (M01 DONE awaiting merge, M02 IN_PROGRESS), `docs/MAOS_PROGRESS.md` (M01 entry, O18), `docs/MAOS_RESUME.md` |
| TESTS_COMPLETED | F03: suite 5/5, full 44-file batch 20× 459/459 on disposable PG18. F02: web 301/301 + CI SUCCESS. F01: 296/296 + CI SUCCESS. E01: 301/301 + CI SUCCESS. On `de2ee1b`: API unit 401/401, integration 35/35 + 458/458, web 291/291, production smoke 34/34 |
| TESTS_PENDING | CI API job on #140 (fix only if red); CI on #141 (docs) |
| PRODUCTION | `jihad` + `maos-web` SUCCESS on `de2ee1b`; readiness 200; last verified 2026-11-03 (this session); bucket 0 objects |
| KNOWN_BLOCKERS | Owner decisions O1–O18 in `docs/MAOS_PROGRESS.md`; none blocks M02–M04, E03, E05 |
| EXACT_NEXT_ACTION | 1) Check CI on #140 and #141 (fix only if red). 2) M02 on `feat/sidebar-regroup` from `origin/main`: in `apps/web/src/components/shell/sidebar.tsx` replace `navGroups` with the eight target groups per the M01 table (ids: Workspace = dashboard, control-center, my-work, calendar, notifications, chat, collaboration; Company & Team = company-access, admin-users, admin-invites (or `team` once #137 merges), audit; Projects & Delivery = projects, tasks, time, files, approvals, voice, complaints (+ requests once #136 merges); Customers & CRM = customers, crm; Finance & Banking = finance, invoices; AI Assistant = (none yet); Reports = reports; Settings = data, settings); routes and `allowedRoles` untouched; new web test (eight labels in order, every id in exactly one group, CLIENT none, CONTRACTOR view); run `npm test` + typecheck; draft PR. 3) M03/M04: visual check 375/768/1440 with the built-in browser if a logged-in workspace is reachable, else record NOT VERIFIED. 4) Keep these three files current and push to #133 |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| LAST_UPDATED | 2026-11-03 03:50Z |
