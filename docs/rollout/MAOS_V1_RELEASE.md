# MAOS V1 release — runbook, rollback and backlog

Status: **prepared, not executed.** Every step marked **(owner)** needs the owner's explicit go
for that step. Nothing here has been run against production.
Grant details for #124 are in `ACCESS_GRANTS_ROLLOUT.md` (same folder).

## 1. What V1 is

Live today on `main` (`efef02c`, #119): auth and invites, multi-company switching, CRM, customers,
projects, tasks and boards (status columns), files, approvals, client portal, invoices, payments,
finance, chat, notifications, nightly backup through the private tunnel (R01).

V1 adds three PRs and one operator-tools PR. None of them has a schema change or a migration;
none needs a new environment variable.

| PR | What | Deploys | V1 decision |
|---|---|---|---|
| #121 | Private-tunnel mode for the read-only check and the one-migration runner | nothing (`scripts/` only) | **Ready.** Merge first |
| #124 | Explicit per-company grants: approvers, manager invoices/payments, employee tasks, contractor chat | `jihad` + `maos-web` | **Ready after the impact report** (step 3) |
| #122 | Role-aware Dashboard | `maos-web` | **Ready** |
| #123 | Owner Control Center (stacked on #122; retarget to `main` after #122) | `jihad` + `maos-web` | **Ready** |
| #120 | Custom project board lists | migration A | **Postponed** (backlog) |
| #109 | One rate/cost module (refactor) | `jihad` | **Postponed** (backlog) |
| #110 | UI/UX audit docs | nothing | **Postponed**; conflicts on the ledger (backlog) |

Verified together on an isolated stack with fictional data (main + #124 + #122/#123 merged locally):
all five roles, company switching, Dashboard, Control Center, task create/assign/move, invoices and
finance access, approvals, contractor chat (API 57/57; every Dashboard link per role opens; CLIENT
lands in the portal). Production is not verified until step 8.

## 2. Owner decisions before the release

1. **Secrets after the 2026-10-21 Railway disclosure.** Done 2026-10-31: `JWT_SECRET` rotated
   (old access tokens refused, sessions kept; there is no `JWT_REFRESH_SECRET` in the code) and the
   PostgreSQL password rotated (Railway variables and the backup Keychain item updated; backup and
   restore verified). `RESEND_API_KEY` remains unverified (backlog).
2. **Impact report** (read-only, step 3). Run 2026-10-31: one company (Soldado Services GmbH), one
   employee (`3481ab4e`) would go from 5 visible tasks to 0; no managers, contractors, waiting
   approvals or grant rows. **Decision:** that employee temporarily keeps today's view with
   "Sees all tasks", nothing else (temporary exception, see backlog).
3. **Go for each merge** (steps 4, 6, 7).

## 3. Release steps

0. Preconditions: CI green on each PR head; Mac awake and on power; Docker running;
   `railway whoami` signed in; not between 03:00 and 06:30 (nightly backup window).
1. **(owner) Fresh verified backup.** The last good dump is from 2026-10-30; the 2026-10-31 run
   failed (Mac slept and the tunnel dropped). Run the backup agent now and wait for
   `SUCCESS` plus a rehearsal `REHEARSAL OK`:
   `launchctl kickstart gui/$(id -u)/com.soldado.maos.backup`
   (logs: `~/MAOS_BACKUPS/logs/backup.log`).
2. **(owner) Merge #121.** Nothing redeploys (watch paths `/apps/api/**`, `/apps/web/**`).
3. **(owner) Impact report**, read-only, through the private tunnel:
   `operator/run-access-impact-report.sh` in the operator worktree (exact files pinned by
   `operator/MANIFEST.sha256`; 5-minute limit; prints an audit summary without credentials or
   personal data). Decide the grants per company from it.
   Steps 1–3 done 2026-10-31 (backup `maos-20261031T223616Z.dump`, #121 merged as `ca2c90e`).
4. **(owner) Merge #124** (`gh pr ready 124`, then merge) → `jihad` and `maos-web` redeploy.
   Verify (step 8). Right after: Company access → Soldado Services GmbH → employee `3481ab4e` →
   "Sees all tasks" on, nothing else. Until then that employee sees no tasks.
5. Re-run the impact report (approved) to confirm: section 5 shows only that employee's
   `all-tasks` grant rows.
6. **(owner) Merge #122** (`gh pr ready 122`, then merge) → `maos-web` redeploys. Verify.
7. **(owner)** Retarget #123 to `main` (`gh pr edit 123 --base main`), confirm CI green,
   `gh pr ready 123`, **merge** → `jihad` and `maos-web` redeploy. Verify.
8. **Production verification after each deploy:** Railway deployment SUCCESS on the merge commit,
   no restart loop; `/api/health` and `/api/health/ready` 200; logs without errors; owner opens
   Dashboard and (after #123) Control Center; the audit log shows exactly one
   `membership.grant_updated` (all-tasks) for the employee.
9. **Close-out:** update the ledger capsule (V1 released, main SHA, verification), close the
   finished PRs by merge, stop the local development servers and remove the scratch worktrees
   used for this release.

## 4. Rollback

- Application rollback only: no V1 PR changes the schema, so the database stays as it is.
- Fastest: in Railway, redeploy the previous successful deployment of `jihad` / `maos-web`.
  Durable: a revert PR of the merge commit, merged with the owner's go.
- #123 and #122 can be reverted on their own. Reverting #124 restores the previous permissions
  (managers again read invoices, record payments and decide approvals). Grant rows left behind:
  see `ACCESS_GRANTS_ROLLOUT.md` §6; changing them is a production data write and needs approval.

## 5. Backlog after V1 (not started)

| Item | Note |
|---|---|
| #120 board lists | Needs a migration window: fresh backup, `migrate-deploy-one.sh` in private mode (#121), rollback SQL in `docs/migrations/PROJECT_BOARD_LISTS_GATE.md`. Migration B (several assignees) deferred |
| #109 rate/cost refactor | No behaviour change; merge when convenient |
| #110 UI/UX audit | Resolve the ledger conflict or drop the ledger part |
| Dashboard "Invoices" chip for managers with an invoice grant | Today shown to OWNER only |
| Invoice detail shows the payments list to managers with "Views invoices" | Existing behaviour; decide if it should need "Records payments" |
| `/client/*` routes also answer internal roles (portal preview) | Existing behaviour; review |
| Nightly backup reliability | Failures on 2026-10-29 (tunnel did not start) and 2026-10-31 (Mac slept); the installer template still lacks `MAOS_BACKUP_CONNECTION=private` |
| D2 off-site backup copy | Not configured; backups exist only on this Mac |
| API `npm run typecheck` | 149 legacy Jest spec errors (same on `main`; CI uses `tsconfig.build.json`, clean) |
| **Temporary exception:** employee `3481ab4e` (Soldado Services GmbH) has "Sees all tasks" | Granted at the V1 release to keep today's view. Review: assign the employee's tasks and project memberships, then switch the grant off. Do not assign all tasks automatically |
| Existing-user invite opens in the same tab | UX only (#114 note) |
| T45 webhook secret, T46 real-data gate, D5 repository visibility / branch protection | Owner gates; `REAL_CLIENT_DATA_ALLOWED = NO` until G-DATA |
