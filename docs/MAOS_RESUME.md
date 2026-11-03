# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | #148 (D02 wording fix) merged `ff21ca6` and deployed (`maos-web` SUCCESS, API skipped); production page verified. Before: O1 isolated acceptance 24/24; release 2026-11-03 (#147) |
| CURRENT_TASK_ID | none active — production signed-in verification BLOCKED (O1/O2); #120 awaits O7. Next READY (research): H01 |
| EXACT_STEP_REACHED | main `ff21ca6` live (web) / `e301574` (API); main CI running on `ff21ca6` at checkpoint. Docs PR #149 open. Panel version 13 |
| CURRENT_BRANCH | code worktree on `release/train-2026-11-03` (merged; may be deleted); `docs/master-plan` (PR #133) for these files |
| WORKTREE | code: `~/Developer/MAOS/claude/.claude/worktrees/team-access-e01-2e2441` (from `origin/main` `de2ee1b`; untracked `graphify-out/` there is local tooling, never commit it). Docs: previous session scratchpad `plan-wt` on `docs/master-plan`. The main checkout `~/Developer/MAOS/claude` belongs to another session (branch `fix/client-scope-inheritance`) — do not touch |
| LAST_RELEVANT_COMMIT | main `e301574` (release train); train head `aba3f60` |
| LAST_RELEVANT_PR | #148 MERGED `ff21ca6`; #149 open (docs checkpoint); #147, #133, #109, #110, #134–#146 MERGED; #120 open (migration, O7) |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md` (section I removed, L01–L10, K06/G05/D02/D03/D04/E02 notes), `docs/MAOS_PROGRESS.md` (scope correction, verification entry, O29–O31), `docs/MAOS_RESUME.md`, `docs/finance/MAOS_DATEV_EXPORT_SPEC_K06.md` (new), `docs/MAOS_PLATFORM_GAPS_G05.md` (new), `docs/tools/progress_panel.py` (pipeline stages, snapshot wording), `docs/tools/fetch_prs.sh` |
| TESTS_COMPLETED | O1 isolated acceptance 24/24 + API isolation matrix 28/28 + reminder job run; #148 web 349/349. Release: train CI green, main CI SUCCESS, smoke PASS, backup + rehearsal OK |
| TESTS_PENDING | main CI on `ff21ca6` (check once); production signed-in verification (BLOCKED: O1/O2) |
| PRODUCTION | `maos-web` SUCCESS on `ff21ca6` (2026-11-03), `jihad` SUCCESS on `e301574`; readiness 200; scheduler 4 jobs; backup `maos-20261103T122203Z` verified |
| KNOWN_BLOCKERS | O1/O2 (production signed-in verification), O7 (#120 migration window), then O3–O6, O8, O10, O20, O22–O25, O29–O31 |
| EXACT_NEXT_ACTION | 1) Confirm main CI on `ff21ca6`; merge docs PR #149 when the owner approves docs merges (or keep committing to `docs/master-plan`). 2) On O1/O2: production walk-through with the authorized account or fictional accounts, record PASS/FAIL per row of `docs/MAOS_O1_ACCEPTANCE_2026-11-03.md`. 3) Otherwise H01 research (no purchases); #120 only with a migration window. Regenerate the panel at each boundary |
| PROGRESS_PANEL | Artifact https://claude.ai/artifact/YQKvn1ZehmcspeJFtjemmP (owner's side panel). Pinned to the owner's claude.ai sidebar on 2026-11-03. Regenerate after every task boundary: `sh docs/tools/fetch_prs.sh > prs.json` (n/state/draft/merged/ci in the shape the generator reads), then `python3 docs/tools/progress_panel.py --docs docs --prs prs.json --out panel.html` and publish `panel.html` to that URL. The planning files stay the source of truth; the panel never edits them |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| LAST_UPDATED | 2026-11-03 17:40Z |
