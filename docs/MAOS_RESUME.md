# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | #120 window executed: backup `maos-20261103T140958Z` verified, migration `20261029202156_task_lists` applied to production via the private tunnel, merged `3baaad7`, both services deployed, unauth smoke PASS. Functional board-list test NOT done (usage limit) |
| CURRENT_TASK_ID | INCOMPLETE: #120 functional verification — run the isolated stack from `main` `3baaad7` (as in the O1 walk-through) and exercise board lists (setup, add/rename/archive lists, drag cards, status mapping) plus tasks/My Work/dashboard; production signed-in flows remain BLOCKED (O1/O2) |
| EXACT_STEP_REACHED | main `ff21ca6` live; #120 `d3ca32a` CI SUCCESS, ready for a window; docs PR #149 open; panel version 16 |
| CURRENT_BRANCH | code worktree on `release/train-2026-11-03` (merged; may be deleted); `docs/master-plan` (PR #133) for these files |
| WORKTREE | code: `~/Developer/MAOS/claude/.claude/worktrees/team-access-e01-2e2441` (from `origin/main` `de2ee1b`; untracked `graphify-out/` there is local tooling, never commit it). Docs: previous session scratchpad `plan-wt` on `docs/master-plan`. The main checkout `~/Developer/MAOS/claude` belongs to another session (branch `fix/client-scope-inheritance`) — do not touch |
| LAST_RELEVANT_COMMIT | main `e301574` (release train); train head `aba3f60` |
| LAST_RELEVANT_PR | #120 open, head `d3ca32a`, GitHub CI running at checkpoint (API), ready for a window; #149 open (docs checkpoint); #148, #147, #133, #109, #110, #134–#146 MERGED |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md` (section I removed, L01–L10, K06/G05/D02/D03/D04/E02 notes), `docs/MAOS_PROGRESS.md` (scope correction, verification entry, O29–O31), `docs/MAOS_RESUME.md`, `docs/finance/MAOS_DATEV_EXPORT_SPEC_K06.md` (new), `docs/MAOS_PLATFORM_GAPS_G05.md` (new), `docs/tools/progress_panel.py` (pipeline stages, snapshot wording), `docs/tools/fetch_prs.sh` |
| TESTS_COMPLETED | O1 isolated acceptance 24/24 + API isolation matrix 28/28 + reminder job run; #148 web 349/349. Release: train CI green, main CI SUCCESS, smoke PASS, backup + rehearsal OK |
| TESTS_PENDING | none — GitHub CI SUCCESS on #120 `d3ca32a`; production signed-in verification BLOCKED (O1/O2) |
| PRODUCTION | `jihad` + `maos-web` SUCCESS on `3baaad7` (2026-11-03 14:12Z); 16 migrations; readiness 200; backup `maos-20261103T140958Z` verified |
| KNOWN_BLOCKERS | O7 (#120 window), O1/O2 (production signed-in verification), O24 (ADR-019), O34 (ADR-020), then O3–O6, O8, O10, O20, O22, O23, O25, O29–O31 |
| EXACT_NEXT_ACTION | 1) Check main CI on `3baaad7`. 2) Isolated functional test of board lists + existing workflows on `3baaad7`; fix and release any defect (needs approval if code changes); record PASS/FAIL; then mark G01 DONE or revert (`git revert 3baaad7` + rollback SQL). 3) Panel; docs PR #149 |
| PROGRESS_PANEL | Artifact https://claude.ai/artifact/YQKvn1ZehmcspeJFtjemmP (owner's side panel). Pinned to the owner's claude.ai sidebar on 2026-11-03. Regenerate after every task boundary: `sh docs/tools/fetch_prs.sh > prs.json` (n/state/draft/merged/ci in the shape the generator reads), then `python3 docs/tools/progress_panel.py --docs docs --prs prs.json --out panel.html` and publish `panel.html` to that URL. The planning files stay the source of truth; the panel never edits them |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| LAST_UPDATED | 2026-11-03 19:40Z |
