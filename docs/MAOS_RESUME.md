# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | E03 security regression audit: 10/10 PASS, new gate on draft PR #143 (branch `test/e03-role-transitions`). Before: M03/M04 PASS, M02 #142, M01 #141, F03 #140, F02 #139, F01 #138, E01 #137 (CI SUCCESS on #137–#142), #136, #135, #134, #133 |
| CURRENT_TASK_ID | none active — every remaining row is owner-gated (decisions O1–O23) or depends on a merge; next after an owner message: the merge the owner names, then production verification of what was merged |
| EXACT_STEP_REACHED | Phase 3 rows E01, E03, F01–F03, M01–M04 and G04 done; E05 gated (O23). Open PRs from this plan: #133 docs, #134–#143 (O9, O11–O21). Progress panel current (version after E03/G04) |
| CURRENT_BRANCH | `test/e03-role-transitions` (PR #143) in the code worktree; `docs/master-plan` (PR #133) for these files |
| WORKTREE | code: `~/Developer/MAOS/claude/.claude/worktrees/team-access-e01-2e2441` (from `origin/main` `de2ee1b`; untracked `graphify-out/` there is local tooling, never commit it). Docs: previous session scratchpad `plan-wt` on `docs/master-plan`. The main checkout `~/Developer/MAOS/claude` belongs to another session (branch `fix/client-scope-inheritance`) — do not touch |
| LAST_RELEVANT_COMMIT | E03 commit on `test/e03-role-transitions` (PR #143); M02 (#142); M01 (#141); F03 (#140); F02 (#139); F01 (#138); E01 `7b70cfc` (#137); main `de2ee1b` (#131) |
| LAST_RELEVANT_PR | #143 draft (E03); #142 draft (M02, CI SUCCESS); #141 #140 #139 #138 #137 draft (CI SUCCESS); #133 open (planning docs); #134 #135 #136 draft; #109, #110, #120 open (owner decisions) |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md` (E03 DONE awaiting merge), `docs/MAOS_PROGRESS.md` (E03 evidence table, O21), `docs/MAOS_RESUME.md`, `docs/tools/progress_panel.py` |
| TESTS_COMPLETED | E03: new gate 8/8, security suites together 81/81, full parallel batch 3× green for the gate. M02: web 299/299. F03: suite 5/5, full batch 20× 459/459. F02 301/301, F01 296/296, E01 301/301, all CI SUCCESS. On `de2ee1b`: API unit 401/401, integration 35/35 + 458/458, web 291/291, production smoke 34/34 |
| TESTS_PENDING | CI on #143 (fix only if red) |
| PRODUCTION | `jihad` + `maos-web` SUCCESS on `de2ee1b`; readiness 200; last verified 2026-11-03 (this session); bucket 0 objects |
| KNOWN_BLOCKERS | Owner decisions O1–O23 in `docs/MAOS_PROGRESS.md`; merges of #134–#143 are one owner message each; E05 needs a production read path (O23) |
| EXACT_NEXT_ACTION | 1) Wait for an owner message (merge approvals O9, O11–O21; or O23 for E05). 2) On a merge: verify CI on main, Railway deploy status, readiness, then run the production smoke that applies and record PASS/FAIL in PROGRESS. 3) Regenerate the progress panel after each boundary (PROGRESS_PANEL row). 4) Keep these three files current and push to #133; report in Arabic |
| PROGRESS_PANEL | Artifact https://claude.ai/artifact/YQKvn1ZehmcspeJFtjemmP (owner's side panel). Pinned to the owner's claude.ai sidebar on 2026-11-03. Regenerate after every task boundary: `sh docs/tools/fetch_prs.sh > prs.json` (n/state/draft/merged/ci in the shape the generator reads), then `python3 docs/tools/progress_panel.py --docs docs --prs prs.json --out panel.html` and publish `panel.html` to that URL. The planning files stay the source of truth; the panel never edits them |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| LAST_UPDATED | 2026-11-03 10:30Z |
