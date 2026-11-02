# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | M03/M04 visual navigation check PASS at 1440/768/375 on #142 (2026-11-03). Before: M02 #142, M01 #141, F03 #140, F02 #139, F01 #138, E01 #137 (CI SUCCESS on #137–#141), #136 D02, #135 C03, #134 J07, #133 docs |
| CURRENT_TASK_ID | none active — next READY rows: E03 (grant drops on role change: verify/add test), E05 (read-only production review of test-looking accounts, report only); A/B/J/K/L/G rows owner-gated |
| EXACT_STEP_REACHED | Phase 3 rows E01, F01–F03, M01–M04 delivered as draft PRs #137–#142 (M03/M04 evidence only). Owner decisions O14–O20 added. Open PRs from this plan: #133 docs, #134–#142. Isolated demo stack stopped; F03 container removed; local web dev server stopped |
| CURRENT_BRANCH | `feat/sidebar-regroup` (PR #142) in the code worktree `.claude/worktrees/team-access-e01-2e2441`; `docs/master-plan` (PR #133) for these files |
| WORKTREE | code: `~/Developer/MAOS/claude/.claude/worktrees/team-access-e01-2e2441` (from `origin/main` `de2ee1b`; untracked `graphify-out/` there is local tooling, never commit it). Docs: previous session scratchpad `plan-wt` on `docs/master-plan`. The main checkout `~/Developer/MAOS/claude` belongs to another session (branch `fix/client-scope-inheritance`) — do not touch |
| LAST_RELEVANT_COMMIT | M02 commit on `feat/sidebar-regroup` (PR #142); M01 (#141); F03 (#140); F02 (#139); F01 (#138); E01 `7b70cfc` (#137); main `de2ee1b` (#131) |
| LAST_RELEVANT_PR | #142 draft (M02); #141 draft (M01 docs, CI SUCCESS); #140 draft (F03, CI SUCCESS); #139 #138 #137 draft (CI SUCCESS); #133 open (planning docs); #134 #135 #136 draft; #109, #110, #120 open (owner decisions) |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md` (M03, M04 DONE), `docs/MAOS_PROGRESS.md` (M03/M04 entry, O20), `docs/MAOS_RESUME.md` |
| TESTS_COMPLETED | M02: web typecheck, `next build`, 299/299. F03: suite 5/5, full batch 20× 459/459. F02 301/301, F01 296/296, E01 301/301, all with CI SUCCESS. On `de2ee1b`: API unit 401/401, integration 35/35 + 458/458, web 291/291, production smoke 34/34 |
| TESTS_PENDING | CI on #142 (fix only if red) |
| PRODUCTION | `jihad` + `maos-web` SUCCESS on `de2ee1b`; readiness 200; last verified 2026-11-03 (this session); bucket 0 objects |
| KNOWN_BLOCKERS | Owner decisions O1–O20 in `docs/MAOS_PROGRESS.md`; merges of #137–#142 are one owner message each; the second of #137/#142 to merge needs one assertion in `test/team-access.test.mjs` updated |
| EXACT_NEXT_ACTION | 1) Check CI on #142 (fix only if red). 2) E03 on a branch from `origin/main`: confirm `security-gate-member-management` (or `explicit-grants`) proves grant → role change → grant gone; add the case if missing; draft PR. 3) E05: read-only production review (users with test-looking domains or REMOVED status) — report in PROGRESS only, zero writes; needs production read access the owner must grant (O21 if not already available). 4) Keep these three files current and push to #133; report in Arabic |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| LAST_UPDATED | 2026-11-03 04:50Z |
