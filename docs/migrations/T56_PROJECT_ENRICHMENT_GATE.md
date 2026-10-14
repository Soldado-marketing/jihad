# Migration gate: project enrichment (MAOS-T56/T57)

Status: **GATED. Do not merge or apply without the owner's migration approval.**
Branch: `schema/project-enrichment`. Prepared 2026-10-14. Follows the per-migration procedure of `MIGRATION_GATE_REPORT_2026-10-13.md`: a new fresh backup with sha256, `pg_restore --list` and an isolated restore, then prechecks, apply, verify, and only then the code.

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

- **Budget** (`budgetCents`) is finance data. Only the OWNER may set or clear it, and it is removed from every project response for other roles: list, detail and write responses. This is checked against the database membership.
- **Responsible user** must be an ACTIVE internal member of the tenant.
- **Customer:** an active Customer of the tenant. The project's `clientScopeKey` is set from it in the same write (ADR-017); `null` detaches and clears both. The client portal keeps its explicit field lists, so no new field reaches clients.
- **Project number:** unique per tenant (409 on a clash), assigned `P-0001`, `P-0002`… when left out, retried on a concurrent create. Existing projects stay unnumbered until edited; there is no data backfill.
- **Progress:** from task status, archived tasks excluded, within the caller's task scope.

## Production precheck (read-only, 2026-10-14)

13 migrations finished, 0 failed; none of the five columns exists; 1 project.

## Evidence (disposable PostgreSQL)

- `project-enrichment` **8/8**, with **5/5 mutations caught**: budget not stripped, manager edits budget, client as responsible user, client key not set, archived tasks counted.
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
