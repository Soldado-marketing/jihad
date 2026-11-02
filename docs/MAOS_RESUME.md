# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | M02 sidebar regroup: draft PR #142 (branch `feat/sidebar-regroup`), web 299/299. Before: M01 #141, F03 #140, F02 #139, F01 #138, E01 #137 (CI SUCCESS on #137–#141), #136 D02, #135 C03, #134 J07, #133 docs |
| CURRENT_TASK_ID | M03/M04 — visual check of the regrouped navigation at 375/768/1440 (icons, spacing, grouping, active states; no overflow, every group reachable) |
| EXACT_STEP_REACHED | M03 starting: plan is a local `next dev` of `feat/sidebar-regroup` with a fictional stored user in localStorage (no API needed for the shell) in the built-in browser at three widths; findings → PROGRESS; code changes only if something is broken, on the same branch #142 or a new one |
| CURRENT_BRANCH | `feat/sidebar-regroup` (PR #142) in the code worktree; `docs/master-plan` (PR #133) for these files |
| WORKTREE | code: `~/Developer/MAOS/claude/.claude/worktrees/team-access-e01-2e2441` (from `origin/main` `de2ee1b`; untracked `graphify-out/` there is local tooling, never commit it). Docs: previous session scratchpad `plan-wt` on `docs/master-plan`. The main checkout `~/Developer/MAOS/claude` belongs to another session (branch `fix/client-scope-inheritance`) — do not touch |
| LAST_RELEVANT_COMMIT | M02 commit on `feat/sidebar-regroup` (PR #142); M01 (#141); F03 (#140); F02 (#139); F01 (#138); E01 `7b70cfc` (#137); main `de2ee1b` (#131) |
| LAST_RELEVANT_PR | #142 draft (M02); #141 draft (M01 docs, CI SUCCESS); #140 draft (F03, CI SUCCESS); #139 #138 #137 draft (CI SUCCESS); #133 open (planning docs); #134 #135 #136 draft; #109, #110, #120 open (owner decisions) |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md` (M02 DONE awaiting merge, M03 IN_PROGRESS), `docs/MAOS_PROGRESS.md` (M02 entry, O19), `docs/MAOS_RESUME.md` |
| TESTS_COMPLETED | M02: web typecheck, `next build`, 299/299. F03: suite 5/5, full batch 20× 459/459. F02 301/301, F01 296/296, E01 301/301, all with CI SUCCESS. On `de2ee1b`: API unit 401/401, integration 35/35 + 458/458, web 291/291, production smoke 34/34 |
| TESTS_PENDING | CI on #142 (fix only if red); M03/M04 visual check |
| PRODUCTION | `jihad` + `maos-web` SUCCESS on `de2ee1b`; readiness 200; last verified 2026-11-03 (this session); bucket 0 objects |
| KNOWN_BLOCKERS | Owner decisions O1–O19 in `docs/MAOS_PROGRESS.md`; none blocks M03, M04, E03, E05 |
| EXACT_NEXT_ACTION | 1) Check CI on #142 (fix only if red). 2) M03/M04: run `apps/web` dev server from `feat/sidebar-regroup`, store a fictional OWNER/MANAGER/CONTRACTOR user in localStorage, screenshot sidebar (1440), compact menu (768, 375): groups in order, no horizontal overflow, active state, touch targets; record PASS/FAIL per width in PROGRESS; fix only real defects. 3) Then E03 (grant drops on role change: verify test exists) and E05 (read-only production review, report only) are the next READY rows; A/B/J rows stay owner-gated. 4) Keep these three files current and push to #133 |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| LAST_UPDATED | 2026-11-03 04:20Z |
