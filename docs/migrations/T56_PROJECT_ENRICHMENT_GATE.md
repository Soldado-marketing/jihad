# Migration gate: project enrichment (MAOS-T56/T57)

Status: **GATED. Do not merge or apply without the owner's migration approval.**
Branch: `schema/project-enrichment`. Prepared 2026-10-14; re-audited 2026-10-15 (see "Audit 2026-10-15"). Follows the per-migration procedure of `MIGRATION_GATE_REPORT_2026-10-13.md`: a new fresh backup with sha256, `pg_restore --list` and an isolated restore, then prechecks, apply, verify, and only then the code.

## The migration

`20261014155254_project_enrichment`, additive only (generated with `prisma migrate diff`; no drift on PostgreSQL 18):

| Change | Existing rows |
|---|---|
| `ALTER TABLE "Project" ADD COLUMN` `serviceType TEXT`, `budgetCents INTEGER`, `deadline TIMESTAMP(3)`, `ownerUserId TEXT`, `projectNumber TEXT` (all nullable, no default) | all NULL; catalog-only change, no rewrite |
| `CREATE INDEX` `(tenantId, ownerUserId)`, `(tenantId, deadline)` | built over today's 1 project |
| `CREATE UNIQUE INDEX` `(tenantId, projectNumber)` | every value is NULL, and NULLs never conflict, so this cannot fail. No write freeze is needed, because nothing writes the column before the new code runs |
| FK `ownerUserId → User(id) ON DELETE SET NULL` | validates NULLs only |

No statement updates, deletes or drops anything.

## Code ordering

The new code (T57) selects the new columns, so **migration first, then code**, as with #38 and #65. Old code on the new schema keeps working: the columns are unused by it.

## What the code does (T57)

- **Budget** (`budgetCents`) is finance data. Only the OWNER may set or clear it (403 otherwise), and it is removed from every project response for other roles: list, detail and write responses. Create, update and delete load only the id. DELETE answers 204 with no body. Every other module that reads projects selects narrow fields (search, client portal, activity, tenant references, finance names) or only counts them (customers). This is checked against the database membership.
- **Responsible user** must be an ACTIVE internal member of the tenant.
- **Customer:** an active Customer of the tenant. The project's `clientScopeKey` is set from it in the same write (ADR-017); `null` detaches and clears both. The client portal keeps its explicit field lists, so no new field reaches clients.
- **Project number:** unique per tenant (409 on a clash), assigned `P-0001`, `P-0002`… when left out, retried on a concurrent create. Existing projects stay unnumbered until edited; there is no data backfill.
- **Progress:** from task status, archived tasks excluded, within the caller's task scope.

## Production precheck (read-only, 2026-10-14)

13 migrations finished, 0 failed; none of the five columns exists; 1 project.

## Audit 2026-10-15

- The branch had fallen 9 commits behind main (T63/T64 search, docs) and was CONFLICTING. It was re-merged with main (conflict in `ci.yml` only; both suites kept) and re-merged again after the test-flake fix (#88). The migration file is unchanged (sha256 prefix `c63af1c8656f`).
- Hardening: the project delete now loads only the id, and a test checks that DELETE answers 204 with an empty body.
- Production precheck (read-only, PostgreSQL 18.6): 13/0 migrations, none of the 5 columns or 3 indexes present, 1 project (112 kB), 0 long transactions.
- **Rehearsal** on one disposable PostgreSQL 18 database in production order: main's suites seed data (33 projects); T56 is the only pending migration; after applying it, 14/0 migrations, **0 rows carry a new value**, no unvalidated constraint, no invalid index. **Old code (main) on the new schema** and **new code** both run their full suites and boot with health 200/200.
- The one failure seen in an earlier rehearsal run was a pre-existing race in the customer fill-in test (it also failed on main without T56). It was fixed in #88 and re-verified with 3 runs of 722 tests, 0 failures.

## Evidence (disposable PostgreSQL)

- `project-enrichment` **9/9** (8 + the delete check), with **5/5 mutations caught**: budget not stripped, manager edits budget, client as responsible user, client key not set, archived tasks counted.
- Gate 327/327, integration 322/322 (35 + 287, run as CI runs it), full API 437 tests with 0 failures.
- The repository invariant (every Prisma call names its tenant) holds; `project.create` takes the tenant explicitly.

## Procedure (owner window)

As in the 2026-10-13 report, single step:
1. Docker check; fresh backup, sha256, `pg_restore --list`, isolated restore.
2. Prechecks as above.
3. Apply only `20261014155254_project_enrichment` from a checkout of this branch re-merged with main.
4. Verify columns, indexes and FK, unchanged rows, and health.
5. Merge and deploy; verify CI, Railway, health and logs.

Containment is unchanged: a failure stops; no destructive rollback and no `migrate resolve` without the owner.

## Correction 2026-10-15: migration hash

The sha256 prefix recorded in "Audit 2026-10-15" above (`c63af1c8656f`) is a **documentation error**. It is left in place unchanged as part of the audit history; this section supersedes it.

Verified 2026-10-15 from the repository with `shasum -a 256`:

| Revision | sha256 of `apps/api/prisma/migrations/20261014155254_project_enrichment/migration.sql` |
|---|---|
| `26c04fb` (the file's only commit) | `43b7051b6e52ca040910d0c5fcfd7d0024c9c3853b1e25c038c73867127aee1c` |
| `74f029c` (#84 head at the audit) | same |
| current branch head | same |

The file has exactly one commit and has never been changed, so the reviewed and rehearsed SQL is the SQL that will be applied. The full hash above is the approved value and the operator procedure below refuses any other.

## Operator procedure (stable, replaces temporary helpers)

The 2026-10-13/14 windows used helper scripts in a session scratchpad. They are not part of the repository and are **not** used for T56. The T56 window uses only these reviewed, tested repository files (`apps/api/test/migrate-deploy-one-script.test.mjs`, blocking in CI):

- `scripts/migrate-deploy-one.sh`: a guard around the project's own `prisma migrate deploy`, not a second migration system. It refuses unless `apps/api/.env` is absent, `apps/api/prisma` has no uncommitted or untracked change, `migration.sql` has the approved full sha256, the credential is a PostgreSQL URL from the Keychain (MAOS-T18 item, never printed or passed as an argument), the history has no failed or locally missing migration, and the pending set is **exactly** the approved migration. `check` stops there and writes nothing; `apply` then runs `prisma migrate deploy` and requires `migrate status` "up to date".
- `scripts/db-readonly-check.sh`: runs a check file in `postgres:18` in a session forced read-only (`default_transaction_read_only=on`).
- `docs/migrations/T56_precheck.sql`, `docs/migrations/T56_postcheck.sql`: the precheck and post-apply verification queries.

Run from `~/Developer/MAOS/claude` (backup, restore and read-only checks), and run the migration guard from a **clean worktree of the approved #84 head**. The main checkout keeps a local `apps/api/.env`, which the guard refuses by design. The worktree uses the main checkout's installed Prisma CLI, which is pinned by the lockfile (6.19.3, lockfile unchanged on #84):

```
git worktree add --detach ~/Developer/MAOS/windows/T56 <approved #84 head>
export MAOS_PRISMA_BIN=~/Developer/MAOS/claude/apps/api/node_modules/.bin/prisma
```

1. `docker info`; fresh backup `MAOS_BACKUP_CREDENTIAL_SOURCE=keychain caffeinate -i scripts/nightly-backup.sh` → `SUCCESS`, new `maos-<UTC>.dump`.
2. `shasum -a 256` of the dump equals its `.dump.sha256`; `pg_restore --list` in `postgres:18` is non-empty with every table; `scripts/restore-rehearsal.sh <dump>` → `REHEARSAL OK`.
3. `scripts/db-readonly-check.sh docs/migrations/T56_precheck.sql` → 13 finished / 0 failed, 0 columns, 0 indexes, 0 long transactions, row counts recorded.
4. In `~/Developer/MAOS/windows/T56`: `scripts/migrate-deploy-one.sh check 20261014155254_project_enrichment 43b7051b6e52ca040910d0c5fcfd7d0024c9c3853b1e25c038c73867127aee1c` → `CHECK OK`.
5. **Owner-approved write:** the same command with `apply` → `APPLY OK`.
6. `scripts/db-readonly-check.sh docs/migrations/T56_postcheck.sql` → 14/0, 5 nullable columns, 3 indexes, FK `ON DELETE SET NULL` validated, 0 invalid indexes, 0 rows with a new value, row counts unchanged; health `/api/health` and `/api/health/ready` 200.
7. Merge #84 (merge commit); main CI green, Railway `jihad` SUCCESS on that commit, health 200/200, logs clean.

Containment is unchanged: any refusal or failure stops the window; no destructive rollback and no `migrate resolve` without the owner.
