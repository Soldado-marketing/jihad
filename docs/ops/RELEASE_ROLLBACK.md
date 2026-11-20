# MAOS release and rollback runbook (A08)

**Status:** active since 2026-11-04. **Owner:** the platform owner approves every production step; the operator executes.
**Governance:** `docs/release/hotfix-rollback-baseline.md` (classes, approvals). **Migration windows:** the gate document of the migration in `docs/migrations/`.

Production is Railway project `humorous-fulfillment`: service **API** (`jihad`), service **Web** (`maos-web`), service **Postgres** (private network only, no public TCP proxy). Deploys start from a push to `main`. Nothing in this runbook prints, stores or passes a credential on a command line; the database URL lives in the macOS Keychain item `maos-backup-database-url` and reaches tools through the environment only.

## 1. Before every release

| Check | How | Pass |
|---|---|---|
| CI green on the exact merge candidate | `gh pr view <n> --json statusCheckRollup` | every job `SUCCESS` (API, Isolation gate, Web, Dependency audit, Secret scan) |
| Migration in the PR? | `git diff main...<branch> --stat -- apps/api/prisma/migrations` | none → plain release (section 2); one → migration window (section 3) |
| Fresh verified backup | `scripts/nightly-backup.sh` writes `~/MAOS_BACKUPS/production/maos-<ts>.dump` + `.sha256`; `scripts/restore-rehearsal.sh <dump>` | rehearsal PASS the same day |
| Known-good deploy recorded | `git log origin/main --merges -1` and the current Railway deployment id (dashboard → service → Deployments) | written in the release note before merging |
| Owner approval | one explicit message per merge (decision id Oxx) | recorded in `docs/MAOS_PROGRESS.md` |

## 2. Plain release (no migration)

1. Merge the PR on GitHub (merge commit, never squash: the revert in section 4 relies on `-m 1`). Railway builds and deploys the API and the web app from `main`.
2. Readiness: `GET https://jihad-production.up.railway.app/api/health/ready` → 200 (`/api/health` answers 200 even while the database is unavailable; only `ready` proves it). Expect up to ~90 s of 503 while the new instance starts.
3. Smoke, in this order, with a fictional account only and never with customer data: sign in as OWNER → `/dashboard` → `/projects` → open one project board → `/files` → `/approvals` → sign out; sign in as CLIENT → `/client` shows the client shell only. Blocking criteria in `docs/deployment/railway-smoke-test-checklist.md`.
4. Operational state: `GET /api/health/ops` as OWNER (B06) → `schedulerEnabled: true`, every job `lastFinishedAt` recent, `watchdog.findings` empty.
5. Record: merged SHA, Railway deployment id, smoke result, time, in `docs/MAOS_PROGRESS.md`. The row goes to DEPLOYED, and to VERIFIED only after step 3 and 4 passed.

## 3. Release with one migration (window)

Only inside an owner-approved window, only one migration per window, exactly as the migration's gate document says. Summary of the proven sequence (used for #120 on 2026-11-03):

1. Fresh backup, `sha256`, `pg_restore --list`, isolated restore rehearsal of **that** dump.
2. Rehearse on a restored copy: `prisma migrate deploy` applies only the approved folder; the **rollback SQL** from the gate document brings it back; re-apply; a data checksum is identical at every point; `prisma migrate diff` reports no drift. Container removed.
3. Approval message from the owner naming the migration folder and its `sha256`.
4. `MAOS_DB_CONNECTION=private scripts/migrate-deploy-one.sh check <folder> <sha256>`, then `apply`. The script refuses unless that folder is the only pending migration, its `migration.sql` matches the hash, `apps/api/.env` is absent and `prisma/` is clean.
5. Verify through `scripts/db-readonly-check.sh` (read-only session): `_prisma_migrations` count, new table or column present.
6. The old API keeps running on the new schema (every MAOS migration is additive: nullable columns, new tables). Merge the PR → deploy → steps 2–5 of section 2.

## 4. Application rollback

**Trigger:** readiness stays 503 after 5 minutes, the smoke fails, an isolation or finance defect is confirmed, or error volume in the Railway logs rises after the deploy.

**Fastest path — Railway redeploy of the previous deployment** (owner or operator with Railway access): service → Deployments → previous successful deployment → *Redeploy*. Same image as before, no code change, under two minutes. Do this first for an outage; then decide between fixing forward and reverting.

**Durable path — revert on `main`:**

```bash
git fetch origin
git revert --no-commit -m 1 <merge-sha>      # the release merge commit
git status --short                            # review: only the release's files
```

- If the release carried a **migration**, the revert also deletes the migration folder from the repository while the database still has it applied. `prisma migrate status` then reports an applied migration that is missing locally, and `migrate-deploy-one.sh` refuses every later migration. Either keep the folder (`git checkout <merge-sha> -- apps/api/prisma/migrations/<folder>` before committing the revert) or run the database rollback of section 5 in the same window. Keeping the folder is the default: old code ignores an unused nullable column or table.
- Commit, open a PR titled `Revert release <merge-sha>`, let CI run, merge with the owner's approval. Railway deploys the reverted `main`.
- Never `git push --force`, never rewrite `main`, never delete migration history.

Rehearsed 2026-11-04: `git revert --no-commit -m 1 3baaad7` (release #120) applies cleanly, 32 files, one migration folder among them; aborted after inspection.

## 5. Database rollback

Only with the rollback SQL written and rehearsed in the migration's gate document; only after a fresh verified backup; only inside an approved window. MAOS migrations are additive, so rollback removes the new objects and loses only the data that lived in them (for #120: list names, order and card placement; never tasks, statuses or assignments).

Sequence: `scripts/nightly-backup.sh` (fresh dump) → the SQL through the private tunnel in one transaction, ending with `DELETE FROM "_prisma_migrations" WHERE migration_name = '<folder>'` → `prisma migrate status` shows that folder pending → deploy the application that matches the schema. Re-applying later is the normal path of section 3.

Rehearsed 2026-11-04 on an isolated, fictional database (see the drill record at the end of this file).

## 6. Restoring from a backup (data loss or corruption)

`scripts/restore-db.sh` never overwrites a database: it restores into a **new** database on the target server. Promoting the copy is a deliberate, owner-approved step.

1. Pick the newest verified dump: `~/MAOS_BACKUPS/production/`, its `.sha256` must match (`shasum -a 256 -c`).
2. Prove it: `scripts/restore-rehearsal.sh <dump>` (network-less container).
3. With the owner: create the new database on the Railway Postgres through the private tunnel with `restore-db.sh`, point the API's `DATABASE_URL` at it (Railway variable, by reference), redeploy, readiness, smoke.
4. Keep the previous database untouched until the owner closes the incident.

Recovery objectives in force: a nightly dump means at most 24 h of data loss (RPO 24 h); the restore path above has been rehearsed in under 30 minutes on a copy (RTO target 1 h). Weekly `scheduled-rehearsal.sh` keeps the proof current; `backup-staleness-check.sh` alerts after 26 h without a verified dump.

## 7. After any rollback

- Readiness, smoke and `/api/health/ops` as in section 2.
- `docs/MAOS_PROGRESS.md`: what was rolled back, why, the deployment ids before and after, the owner's approval message.
- The task's row returns to IMPLEMENTED (or TESTED) with the defect noted; the fix is a new PR through the full gate.
- A post-incident entry in `docs/ops/INCIDENTS.md` when the trigger was an incident.

## Drill record

| Date | Drill | Result |
|---|---|---|
| 2026-11-03 | #120 migration + rollback SQL + re-apply on a restored production copy (isolated) | PASS, checksum identical at four points (`PROJECT_BOARD_LISTS_GATE.md`) |
| 2026-11-04 | `git revert -m 1` of the latest release merge, staged and inspected locally | applies cleanly; migration-folder trap documented above |
| 2026-11-04 | Rollback SQL of `20261029202156_task_lists` on an isolated PostgreSQL 16 (16 migrations, seeded by the `task-lists` suite: 5 tasks, 13 lists, 3 cards in lists), then re-apply, then `prisma migrate diff` | PASS: 16 → 15 (`TaskList` and `Task.listId` gone, folder pending) → 16; task checksum `5:99656205…` identical at all three points; no drift; container removed |
| pending | Railway redeploy of a previous deployment, then forward again | needs an owner window on production or a staging service (`docs/deployment/maos-railway-staging-decision.md`) |
