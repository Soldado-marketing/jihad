# Migration Gate Report — PRs #26, #36, #38 (2026-10-11)

One decision for three production migrations. All three are **additive**: no existing row is changed, no column is dropped or renamed. Nothing below has been applied; production was only **read** (read-only session) for the prechecks.

## Summary

| PR | Task | Migration | Changes | Existing rows touched | Precheck | Code needs migration first? |
|---|---|---|---|---|---|---|
| #36 | T40 revenue posted once | `20261011085435_revenue_record_unique_invoice` | 1 unique index on `RevenueRecord(tenantId, invoiceId)` | none (index build reads 1 row) | **0 duplicate groups** ✅ | No — code safe in both orders |
| #38 | D16b payment idempotency | `20261011090404_payment_idempotency_key` | nullable column `Payment.idempotencyKey` + unique index `(tenantId, idempotencyKey)` | none (2 rows get NULL) | column/index absent ✅ | **Yes** — new code writes the column |
| #26 | T44 email delivery tracking | `20261010134025_add_email_delivery_tracking` | enum `EmailDeliveryStatus`; tables `EmailMessage`, `EmailEvent`; 4 indexes; 2 FKs | none | tables/enum absent ✅ | **Yes** — apply before the API image |

## Production state (read-only, 2026-10-11)

- PostgreSQL 18.6; session `default_transaction_read_only = on`.
- `_prisma_migrations`: 8 applied, all finished, none rolled back — identical to the 8 folders on `main`. No other migration is pending.
- Rows: `RevenueRecord` 1, `Payment` 2, `Invoice` 1.
- **#36 precheck:** `SELECT count(*) FROM (SELECT "tenantId","invoiceId" FROM "RevenueRecord" WHERE "invoiceId" IS NOT NULL GROUP BY 1,2 HAVING count(*)>1) d;` → **0**.
- None of the objects the three migrations create exists yet (`EmailMessage`, `EmailEvent`, `EmailDeliveryStatus`, both new indexes, the new column).
- Newest backup: `maos-20261010T013010Z.dump` — sha256 matches, `pg_restore --list` 429 entries (43 tables), full restore rehearsal in an isolated container **PASS** (T22). The 2026-10-11 nightly failed on transient SSL drops (see T21).

## Exact schema changes

**#36**
```sql
CREATE UNIQUE INDEX "RevenueRecord_tenantId_invoiceId_key" ON "RevenueRecord"("tenantId", "invoiceId");
```

**#38**
```sql
ALTER TABLE "Payment" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Payment_tenantId_idempotencyKey_key" ON "Payment"("tenantId", "idempotencyKey");
```

**#26** — `CREATE TYPE "EmailDeliveryStatus" AS ENUM (6 values)`; `CREATE TABLE "EmailMessage"` and `"EmailEvent"`; unique index on `EmailMessage.providerMessageId`; indexes on `(tenantId, resourceType, resourceId)`, `(emailMessageId, occurredAt)`, `tenantId`; FKs to `Tenant` and `EmailMessage` with `ON DELETE CASCADE` (full SQL in the PR).

## Lock and downtime risk

- #36: `CREATE UNIQUE INDEX` blocks writes to `RevenueRecord` while it builds — 1 row, milliseconds.
- #38: `ADD COLUMN` with no default is a catalog-only change (brief exclusive lock); the index builds over 2 rows — milliseconds.
- #26: new objects only; the FK to `Tenant` takes a brief share lock on `Tenant`.
- **Expected downtime: none.** No API restart is needed to apply the schema.

## Procedure (one window, forward-only)

1. **Freeze**: no merges to `main` during the window. Confirm CI green on #26, #36, #38 (all three were brought up to date with `main` on 2026-10-11 and pass gate + integration locally).
2. **Fresh backup**: run `scripts/nightly-backup.sh` (credential from the Keychain). Verify the new dump's sha256, run `pg_restore --list`, and run `scripts/restore-rehearsal.sh` on it. Do not continue unless all three pass.
3. **Re-run the read-only prechecks** above; #36 must still return 0 and all new objects must still be absent.
4. **Apply** from a local, unpushed integration checkout that contains all three migration folders:
   `prisma migrate deploy` with `DATABASE_URL` from the Keychain in the environment (never on the command line). Prisma applies them in timestamp order: #26, #36, #38.
5. **Verify the schema** (read-only): `_prisma_migrations` shows 11 finished, 0 failed; the new tables, enum, column and indexes exist; row counts unchanged.
6. **Health**: `GET /api/health` and `/api/health/ready` → 200 (old code keeps running on the new schema).
7. **Deploy code** by merging, one at a time with full CI → Railway → health checks: **#36, then #38, then #26**.
8. **Smoke checks**: a repeated payment submit with the same `Idempotency-Key` returns `replayed: true`; `GET /api/invoices/:id/deliveries` answers 200; health 200/200.

## Rollback and containment

- **Before step 4 fails or any check fails**: stop; nothing has changed.
- **A migration fails mid-way** (Prisma marks it failed): do not deploy any code. The objects involved are all new, so existing data is untouched. Inspect, drop only the partially created new objects, `prisma migrate resolve --rolled-back <name>`, and reschedule. The backup from step 2 is the fallback only if data were ever affected (not expected: no statement updates rows).
- **After success, if the new code misbehaves**: roll back the API on Railway to the previous deployment. The schema stays — old code works with it (#26 tables unused, #36 index harmless, #38 column nullable and unused). Forward-only: no down migration.
- `REAL_CLIENT_DATA_ALLOWED` stays **no**; this window does not change it.

## Decision requested

Approve all three for one window (recommended), approve a subset, or defer. #36 alone could be applied safely on its own; #38's code must not deploy before its migration.
