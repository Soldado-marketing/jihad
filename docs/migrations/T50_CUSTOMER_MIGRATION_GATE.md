# Migration gate: Customer (ADR-017, MAOS-T50/T51/T52)

Status: **GATED — do not merge or apply without the owner's migration approval.**
Branch: `schema/customer`. Prepared 2026-10-13.

## What the migration does

`20261013123256_add_customer`, additive only:

| Change | Effect on existing rows |
|---|---|
| `CREATE TYPE "CustomerStatus"` | none |
| `CREATE TABLE "Customer"` with `UNIQUE (tenantId, clientScopeKey)` | none |
| `ADD COLUMN "customerId" TEXT` (nullable) on `Project`, `Invoice`, `FileAsset` | all `NULL`; no rewrite (no default) |
| Index `(tenantId, customerId)` on those three tables | built on small tables |
| FK `customerId → Customer(id) ON DELETE NO ACTION` | validates existing rows, which are all `NULL` |

A second migration on this branch, `20261013212118_add_invite_customer` (MAOS-F2b, CLIENT invites), adds a nullable `Invite.customerId` (FK to `Customer`, `ON DELETE NO ACTION`) and index `(tenantId, customerId)`. Existing invites keep `NULL`; nothing is rewritten.

Nothing is dropped, renamed or made required. `clientScopeKey` stays the authorization boundary; the portal filters are unchanged.

## Compatibility

- **Old code on the new schema:** works. The current code never reads or writes `customerId` or `Customer`.
- **New code on the old schema:** fails (the code writes `customerId`). So the migration must be applied **before** this branch is deployed, as with #38.
- **Rollback:** forward-only. If the deploy fails after the migration, the old code keeps running on the new schema. The new table and columns can stay unused.

## Order with the other gated migrations

Apply in timestamp order in one window: #36 (`RevenueRecord` unique), #38 (`Payment.idempotencyKey`), #26 (email tracking), then this one. `prisma migrate deploy` applies all pending migrations in name order. See `MIGRATION_GATE_REPORT_2026-10-11.md` for the first three.

## Procedure (owner window)

1. Freeze writes. Take a fresh backup with sha256, `pg_restore --list` and an isolated rehearsal (the existing runbook).
2. Read-only precheck: no `Customer` table or `CustomerStatus` type exists yet, and `_prisma_migrations` matches `main`.
3. `prisma migrate deploy` from a checkout of this branch (credential from the environment, never as an argument).
4. Verify: the new table, columns and FKs exist, and health and readiness return 200.
5. Merge and deploy this branch.
6. Backfill: `node dist/modules/customers/backfill-customers.cli.js` (dry run: counts per tenant). Compare `distinctKeys` with expectations, then run it with `--apply`. A second `--apply` must report 0 created and 0 changed.
7. Smoke test: `GET /api/customers` as OWNER returns the backfilled customers, named after their keys. The owner renames them. The client portal behaves exactly as before.

## Evidence on a disposable database (2026-10-13)

- Fresh PostgreSQL 16 with all migrations applied: 9 migrations.
- Isolation suites (client isolation, onboarding scope, three foreign-id suites): **80/80 before and 80/80 after** a real backfill run.
- Backfill: dry run wrote nothing; `--apply` created 4 customers and linked 15 rows; a re-run created 0 and changed 0.
- `customers` integration suite **9/9**; 6 of 6 mutations caught (derivation, repair, archive rule, responsible person, tenant scope, file re-link).
- Gate 308/308, integration 293/293, full API 0 failures.
