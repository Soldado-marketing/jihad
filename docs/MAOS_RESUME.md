# MAOS Resume Checkpoint

Read this first in every new session (also on `كمل MAOS`), then `docs/MAOS_MASTER_TASK_LIST.md`, then verify against `git status --short`, the current branch and HEAD, `origin/main`, open PRs and Railway. Continue from EXACT_NEXT_ACTION. Never restart the plan, repeat completed work, open a duplicate PR or assume a deployment succeeded without checking.

| Field | Value |
|---|---|
| LAST_COMPLETED_TASK | Roadmap v2: full development tree (154 rows, phases 0–10, decisions O36–O49) in `docs/MAOS_MASTER_DEVELOPMENT_TREE.md`. Before: O1/O2 53/53, G01/#120, #148, release 2026-11-03 |
| CURRENT_TASK_ID | B06 (#150 `40e0f11`, batch green, API CI running) and B08 (`fix/dependency-advisories` in worktree `.claude/worktrees/b08-deps`: next 15.5.29 + overrides, audit 0 prod advisories, CI audit blocking + gitleaks; builds/tests running). Both then READY FOR RELEASE under O50 |
| EXACT_STEP_REACHED | B06 starting: design from scheduler.service.ts + notifications writer; no schema change |
| CURRENT_BRANCH | `feat/ops-alerts` (PR #150) in the code worktree; `docs/master-plan` (PR #149) for these files |
| WORKTREE | code: `~/Developer/MAOS/claude/.claude/worktrees/team-access-e01-2e2441` (branch `feat/ops-alerts`); second worktree `~/Developer/MAOS/claude/.claude/worktrees/b08-deps` (branch `fix/dependency-advisories`, node_modules installed). Docs: previous session scratchpad `plan-wt` on `docs/master-plan`. Main checkout belongs to another session — do not touch |
| LAST_RELEVANT_COMMIT | main `e301574` (release train); train head `aba3f60` |
| LAST_RELEVANT_PR | #150 open (B06, CI running); #149 open (docs); #148, #147, #120, #133, #109, #110, #134–#146 MERGED |
| FILES_CHANGED (this branch) | `docs/MAOS_MASTER_TASK_LIST.md` (section I removed, L01–L10, K06/G05/D02/D03/D04/E02 notes), `docs/MAOS_PROGRESS.md` (scope correction, verification entry, O29–O31), `docs/MAOS_RESUME.md`, `docs/finance/MAOS_DATEV_EXPORT_SPEC_K06.md` (new), `docs/MAOS_PLATFORM_GAPS_G05.md` (new), `docs/tools/progress_panel.py` (pipeline stages, snapshot wording), `docs/tools/fetch_prs.sh` |
| TESTS_COMPLETED | B06: ops-alerts 5/5 + scheduler 6/6 (disposable PG18), API unit 572, typecheck clean. Earlier evidence unchanged |
| TESTS_PENDING | GitHub CI on #150 `4ae3ee6`; local integration batch (running) |
| PRODUCTION | `jihad` + `maos-web` SUCCESS on `3baaad7` (16 migrations); readiness 200; fictional O2 data removed (1 tenant / 4 users / 5 tasks / 1 invoice as before); backups `maos-20261103T140958Z`, `…T155001Z` verified |
| KNOWN_BLOCKERS | all remaining rows need an owner decision (O3–O6, O8, O20, O22–O25, O29–O31, O34, O35); no safe code task is left ungated |
| EXACT_NEXT_ACTION | 1) Read scratchpad b08-tests/summary.txt; if green, commit (package.json/package-lock of both apps + ci.yml) on `fix/dependency-advisories`, push, open PR, wait for CI (the new audit and secret-scan jobs must pass). 2) Confirm #150 API CI green → mark B06 and B08 READY FOR RELEASE, request O50 once. 3) Then B09 isolation gate job, B10 + A08 runbooks and drill, A09 e2e smoke; after that Phase 2 ungated rows C05/C06/F04. 4) Panel at each boundary |
| PROGRESS_PANEL | Artifact https://claude.ai/artifact/YQKvn1ZehmcspeJFtjemmP (owner's side panel). Pinned to the owner's claude.ai sidebar on 2026-11-03. Regenerate after every task boundary: `sh docs/tools/fetch_prs.sh > prs.json` (n/state/draft/merged/ci in the shape the generator reads), then `python3 docs/tools/progress_panel.py --docs docs --prs prs.json --out panel.html` and publish `panel.html` to that URL. The planning files stay the source of truth; the panel never edits them |
| STANDING_RULES | one task at a time; fictional data only; `REAL_CLIENT_DATA_ALLOWED = no`; merges/deploys/migrations/secrets/paid services/DNS are owner actions (one owner message per merge); never print secrets; never use the owner's computer or remote desktop without separate authorization |
| ACTIVE_PHASE | Phase 1 — security, backups, monitoring, release stability (engineering open: B06, B08, B09, B10, A08, A09; owner: B01–B04, B07) |
| LAST_UPDATED | 2026-11-04 01:10Z |
