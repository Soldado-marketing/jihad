# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | RELEASE 2026-11-03: train #147 merged (`e301574`) and deployed to Railway (`jihad` + `maos-web` SUCCESS); backup `maos-20261103T122203Z` sha256 OK + REHEARSAL OK; smoke PASS for unauthenticated/forged requests and page delivery; signed-in flows NOT VERIFIED. Rows J07, C03, D02, E01, F01, F02, F03, M01, M02, E03, D04, D03, E02, #109, #110 merged |
| CURRENT_TASK_ID | none active — release complete except signed-in production verification (owner walk-through O1) and #120 (migration window O7). Next READY (research, no purchases): H01 |
| EXACT_STEP_REACHED | main `e301574` live on both services; main CI run 41635387136 running at checkpoint (train head was green). #133 (planning docs) still open for the checkpoint commits after the train. Panel version 11 |
| CURRENT_BRANCH | code worktree on `release/train-2026-11-03` (merged; may be deleted); `docs/master-plan` (PR #133) for these files |
| WORKTREE | code: `~/Developer/MAOS/claude/.claude/worktrees/team-access-e01-2e2441` (from `origin/main` `de2ee1b`; untracked `graphify-out/` there is local tooling, never commit it). Docs: previous session scratchpad `plan-wt` on `docs/master-plan`. The main checkout `~/Developer/MAOS/claude` belongs to another session (branch `fix/client-scope-inheritance`) — do not touch |
| LAST_RELEVANT_COMMIT | main `e301574` (release train); train head `aba3f60` |
| LAST_RELEVANT_PR | #147 MERGED; #109, #110, #134–#146 MERGED via #147; #133 open (docs, checkpoint commits after the train); #120 open (migration, O7) |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md` (section I removed, L01–L10, K06/G05/D02/D03/D04/E02 notes), `docs/MAOS_PROGRESS.md` (scope correction, verification entry, O29–O31), `docs/MAOS_RESUME.md`, `docs/finance/MAOS_DATEV_EXPORT_SPEC_K06.md` (new), `docs/MAOS_PLATFORM_GAPS_G05.md` (new), `docs/tools/progress_panel.py` (pipeline stages, snapshot wording), `docs/tools/fetch_prs.sh` |
| TESTS_COMPLETED | Train `aba3f60` CI: API unit 467, integration-api 39, batch 487, full 572; web; audit; graphify. Production smoke 2026-11-03: 39 checks PASS, 5 expectation errors explained in PROGRESS, 0 regressions. Backup + rehearsal OK |
| TESTS_PENDING | main CI run on `e301574` (check once); signed-in production verification (O1) |
| PRODUCTION | `jihad` + `maos-web` SUCCESS on `e301574` (2026-11-03 12:25Z); readiness 200; scheduler 4 jobs; no error lines in recent logs; backup `maos-20261103T122203Z` verified |
| KNOWN_BLOCKERS | O1 (owner signed-in verification of the released features), O7 (#120 migration window), then O2–O6, O8, O10, O20, O22–O25, O29–O31 |
| EXACT_NEXT_ACTION | 1) Confirm main CI run on `e301574` green; merge #133 (docs only) to close the planning-docs PR. 2) Report the release to the owner in the TASK/PR/CI/DEPLOYMENT/PRODUCTION format; ask for the O1 walk-through of signed-in flows (login, permissions, company isolation, client portal, team management, invoices, new features). 3) If a regression is reported: `git revert e301574` on main (code only), redeploy, record. 4) Then H01 research; #120 only with a migration window |
| PROGRESS_PANEL | Artifact https://claude.ai/artifact/YQKvn1ZehmcspeJFtjemmP (owner's side panel). Pinned to the owner's claude.ai sidebar on 2026-11-03. Regenerate after every task boundary: `sh docs/tools/fetch_prs.sh > prs.json` (n/state/draft/merged/ci in the shape the generator reads), then `python3 docs/tools/progress_panel.py --docs docs --prs prs.json --out panel.html` and publish `panel.html` to that URL. The planning files stay the source of truth; the panel never edits them |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| LAST_UPDATED | 2026-11-03 16:05Z |
