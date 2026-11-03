# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | Roadmap v2: full development tree (154 rows, phases 0–10, decisions O36–O49) in `docs/MAOS_MASTER_DEVELOPMENT_TREE.md`. Before: O1/O2 53/53, G01/#120, #148, release 2026-11-03 |
| CURRENT_TASK_ID | B06 — operational alerts to the OWNER (scheduler watchdog, storage capacity check, `GET /health/ops`); branch `feat/ops-alerts` from `origin/main` `3baaad7` |
| EXACT_STEP_REACHED | B06 starting: design from scheduler.service.ts + notifications writer; no schema change |
| CURRENT_BRANCH | code worktree on `release/train-2026-11-03` (merged; may be deleted); `docs/master-plan` (PR #133) for these files |
| WORKTREE | code: `~/Developer/MAOS/claude/.claude/worktrees/team-access-e01-2e2441` (from `origin/main` `de2ee1b`; untracked `graphify-out/` there is local tooling, never commit it). Docs: previous session scratchpad `plan-wt` on `docs/master-plan`. The main checkout `~/Developer/MAOS/claude` belongs to another session (branch `fix/client-scope-inheritance`) — do not touch |
| LAST_RELEVANT_COMMIT | main `e301574` (release train); train head `aba3f60` |
| LAST_RELEVANT_PR | #120 open, head `d3ca32a`, GitHub CI running at checkpoint (API), ready for a window; #149 open (docs checkpoint); #148, #147, #133, #109, #110, #134–#146 MERGED |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md` (section I removed, L01–L10, K06/G05/D02/D03/D04/E02 notes), `docs/MAOS_PROGRESS.md` (scope correction, verification entry, O29–O31), `docs/MAOS_RESUME.md`, `docs/finance/MAOS_DATEV_EXPORT_SPEC_K06.md` (new), `docs/MAOS_PLATFORM_GAPS_G05.md` (new), `docs/tools/progress_panel.py` (pipeline stages, snapshot wording), `docs/tools/fetch_prs.sh` |
| TESTS_COMPLETED | #120: CI SUCCESS on `3baaad7`, isolated acceptance 13/13, API permission/isolation checks 9/9. Earlier: O1 acceptance 24/24, release smoke, train CI |
| TESTS_PENDING | none — signed-in browser UI on production not run by rule (credential in chat); covered on the isolated stack |
| PRODUCTION | `jihad` + `maos-web` SUCCESS on `3baaad7` (16 migrations); readiness 200; fictional O2 data removed (1 tenant / 4 users / 5 tasks / 1 invoice as before); backups `maos-20261103T140958Z`, `…T155001Z` verified |
| KNOWN_BLOCKERS | all remaining rows need an owner decision (O3–O6, O8, O20, O22–O25, O29–O31, O34, O35); no safe code task is left ungated |
| EXACT_NEXT_ACTION | 1) B06: read scheduler.service.ts run/status, notifications.service notify(), storage.service list; implement `OpsWatchdogJob` (failed outcome → OWNER notice once per failure streak; job silent for 2× interval → notice), `StorageCapacityJob` (ListObjects count/bytes vs `MAOS_STORAGE_ALERT_BYTES`, default 5 GiB), `GET /health/ops` OWNER-only (job statuses, last backup file age is not known to the API → omit); tests on a disposable DB with fault injection; web: no UI yet (R04 later); PR, CI, release approval batched. 2) Then B08 (blocking audit + secret scan), B09 (isolation gate job), B10 + A08 (runbooks + drill), A09 (e2e smoke in CI). 3) Panel at each boundary |
| PROGRESS_PANEL | Artifact https://claude.ai/artifact/YQKvn1ZehmcspeJFtjemmP (owner's side panel). Pinned to the owner's claude.ai sidebar on 2026-11-03. Regenerate after every task boundary: `sh docs/tools/fetch_prs.sh > prs.json` (n/state/draft/merged/ci in the shape the generator reads), then `python3 docs/tools/progress_panel.py --docs docs --prs prs.json --out panel.html` and publish `panel.html` to that URL. The planning files stay the source of truth; the panel never edits them |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| ACTIVE_PHASE | Phase 1 — security, backups, monitoring, release stability (engineering open: B06, B08, B09, B10, A08, A09; owner: B01–B04, B07) |
| LAST_UPDATED | 2026-11-03 23:30Z |
