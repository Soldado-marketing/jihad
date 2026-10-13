# Migration Gate Report: #36 → #38 → #26 → #65 (2026-10-13)

**Status: PREPARED, NOT APPLIED. One owner approval covers this report. Each migration still gets its own fresh, verified backup immediately before it is applied.**

This supersedes the procedure in `MIGRATION_GATE_REPORT_2026-10-11.md`, which stays as history (it applied three migrations in one `migrate deploy`). The owner's order and rule of 2026-10-13 apply: one migration at a time, each with a fresh backup, sha256 check, `pg_restore --list` and prechecks.

## Production state (read-only, 2026-10-13 21:2x UTC)

Read with `default_transaction_read_only = on`. The credential came from the Keychain into an env var and was never printed.

| Check | Result |
|---|---|
| Server | PostgreSQL 18.6 |
| `_prisma_migrations` | 8 applied, all finished, none rolled back; identical to `main` |
| **#36 duplicate `(tenantId, invoiceId)` groups in `RevenueRecord`** | **0** ✅ (must be 0) |
| Objects any of the five migrations would create | all absent ✅ |
| Rows | RevenueRecord 1 · Payment 2 · Invoice 1 · Project 1 · FileAsset 0 · Invite 0 · Tenant 1 |
| Distinct `(tenant, clientScopeKey)` across the 13 key tables | **0**: the #65 fill-in will create 0 Customers |
| Newest verified backup | `maos-20261013T114512Z.dump`, sha256 OK, rehearsal OK |

## Order rehearsal (disposable PostgreSQL 18, 2026-10-13)

Starting from `main`'s 8 migrations, one `prisma migrate deploy` per step. Each step's checkout held only the folders applied so far plus the next one.

**Result:** each step applied exactly its one migration. #26 has an older timestamp and still applied cleanly after #36/#38. End state: **13 applied, 0 failed**; `migrate status`: "Database schema is up to date". Script: `migseq.sh` (session scratchpad).

## The five migrations

| Step | PR | Migration | Changes | Existing rows modified | Lock / downtime | Code needs schema first? |
|---|---|---|---|---|---|---|
| 1 | #36 T40 | `20261011085435_revenue_record_unique_invoice` | `CREATE UNIQUE INDEX "RevenueRecord_tenantId_invoiceId_key" ON "RevenueRecord"("tenantId","invoiceId")` | none | write lock on RevenueRecord during build (1 row: ms) | No (code is safe either way; the index makes the T40 race impossible) |
| 2 | #38 D16b | `20261011090404_payment_idempotency_key` | `ALTER TABLE "Payment" ADD COLUMN "idempotencyKey" TEXT`; `CREATE UNIQUE INDEX "Payment_tenantId_idempotencyKey_key" ON "Payment"("tenantId","idempotencyKey")` | none (2 rows read NULL; no rewrite) | brief exclusive lock (catalog-only column) + ms index build | **Yes**, see below |
| 3 | #26 T44 | `20261010134025_add_email_delivery_tracking` | enum `EmailDeliveryStatus` (6 values); tables `EmailMessage`, `EmailEvent`; unique `EmailMessage.providerMessageId`; indexes `(tenantId, resourceType, resourceId)`, `(emailMessageId, occurredAt)`, `EmailEvent(tenantId)`; FKs → `Tenant`, → `EmailMessage` (CASCADE) | none | new objects; brief share lock on `Tenant` for the FK | **Yes** |
| 4 | #65 T50 | `20261013123256_add_customer` | enum `CustomerStatus`; table `Customer` (`UNIQUE(tenantId, clientScopeKey)`); nullable `customerId` on `Project`, `Invoice`, `FileAsset` + `(tenantId, customerId)` indexes; FKs `ON DELETE NO ACTION` | none (new columns NULL) | catalog-only columns; ms index builds; FK validation over NULLs | **Yes** |
| 5 | #65 F2b | `20261013212118_add_invite_customer` | nullable `Invite.customerId` + index + FK → `Customer` (`NO ACTION`) | none | catalog-only; 0 invite rows | **Yes** (same PR as step 4) |

**Expected downtime: none.** No migration rewrites a table or touches existing values, and the API keeps serving throughout.

### Why the order is migration → then code (and never the reverse)

- **#38:** the new code adds `idempotencyKey` to the Payment model. Prisma selects every scalar column by default, so with the new image and no column, **every payment read and write would fail** (`column "idempotencyKey" does not exist`). The replay lookup also queries it. The migration must be applied and verified **before** #38 is merged/deployed.
- **#26:** the invoice-send path writes `EmailMessage` rows (that write is failure-safe), but `GET /invoices/:id/deliveries` reads the table and would answer 500. So: migration first, then the code.
- **#65:** Project, Invoice and FileAsset gain `customerId` in the model, so the default selects on projects, invoices and files would fail without the columns, and the `/customers` routes need the table. Migration first, then the code. Both #65 migrations run before #65 is merged.
- **#36:** the code (P2002 handling) works with or without the index. Applying first is still the rule.
- Old code on any new schema works: every change is additive and unused by old code. This is what makes "migration first" safe.

## Per-migration procedure (repeat for steps 1 → 5; stop the chain on any failure)

Run from a dedicated local checkout of the step's PR branch, brought up to date with `main` by merge (no rebase). It must contain exactly the migration folders applied so far plus this step's folder (the rehearsal above). Never pass credentials on a command line.

1. **Docker check:** `docker info` succeeds (lesson of 2026-10-13: the dump and rehearsal need Docker). Freeze merges to `main`.
2. **Fresh backup, just for this migration:** `caffeinate -i ~/MAOS_BACKUPS/runtime/current/scripts/nightly-backup.sh` with `MAOS_BACKUP_CREDENTIAL_SOURCE=keychain`. Expect `SUCCESS` and a new `maos-<UTC>.dump` with `.dump.sha256`. **Never reuse the backup of a previous step.**
3. **sha256:** recompute with `shasum -a 256 <dump>` and compare with the `.sha256` file. Must match.
4. **`pg_restore --list`:** run it in `postgres:18` against the dump. The entry count must be non-zero and every table present (the last run had 429 entries / 43 tables).
5. **Isolated rehearsal:** `~/MAOS_BACKUPS/runtime/current/scripts/restore-rehearsal.sh <dump>` → `REHEARSAL OK`. This never touches production.
6. **Prechecks (read-only session):** `_prisma_migrations` = expected count with none failed, and this step's objects absent. Step-specific checks:
   - **#36:** duplicate-group query → must be **0**: `SELECT count(*) FROM (SELECT "tenantId","invoiceId" FROM "RevenueRecord" WHERE "invoiceId" IS NOT NULL GROUP BY 1,2 HAVING count(*)>1) d;`
   - **#38:** no `Payment.idempotencyKey` column and no index.
   - **#26:** no `EmailMessage` / `EmailEvent` / `EmailDeliveryStatus`.
   - **#65:** no `Customer` / `CustomerStatus` / `customerId` columns; distinct-key count recorded (now 0).
7. **Apply only this migration:** `prisma migrate deploy` from the step checkout, with `DATABASE_URL` exported from the Keychain into the environment.
8. **Post-migration verification (read-only):**
   - `_prisma_migrations` count +1, the new row finished, none failed, `migrate status` "up to date";
   - the new objects exist with the exact names above;
   - row counts unchanged;
   - health `/api/health` and `/api/health/ready` → 200 (old code on the new schema).
9. **Deploy this step's code:** merge the PR (merge commit). Wait for main CI green, Railway `jihad` deploy SUCCESS on that commit, health 200/200, and logs free of new errors. Smoke tests:
   - **#38:** a repeated payment submit with the same `Idempotency-Key` returns `replayed: true` (test tenant only).
   - **#26:** `GET /api/invoices/:id/deliveries` → 200.
   - **#65:** see the fill-in step below.
10. Only then go to the next step.

### #65 Customer fill-in and separation checks (after step 5 and the #65 deploy)

As written in `docs/migrations/T50_CUSTOMER_MIGRATION_GATE.md`:

1. Dry run: `node dist/modules/customers/backfill-customers.cli.js` from the #65 checkout with the env credential. Expected `distinctKeys` 0 per tenant (precheck) and nothing written.
2. `--apply`, then a second `--apply`. The second must report **0 created, 0 changed**.
3. `GET /api/customers` as OWNER → 200, list matches the dry run; CONTRACTOR/CLIENT → 403.
4. Client separation: the portal behaves exactly as before. `clientScopeKey` stays the authorization boundary; the Customer only references it and its key is immutable. The isolation suites already proved 80/80 before and after a real fill-in on a disposable copy.

## Containment if a step fails

- **Any check in steps 1–6 fails:** stop. Nothing has changed. Record the evidence.
- **`migrate deploy` fails (step 7):**
  1. Stop the chain and **do not deploy that step's code**.
  2. No destructive rollback and no `DROP`. Preserve the evidence: `migrate status` output, `_prisma_migrations` row, server log.
  3. Production keeps running the old code, which ignores the new objects.
  4. A partly created **new** object is inspected and handled only with a new owner decision (`prisma migrate resolve` is an owner-approved step).
  5. The step's fresh backup is the recovery point, needed only if existing data were affected. That isn't expected: no statement in these migrations updates rows.
- **The step's code misbehaves after deploy (step 9):** roll back the Railway `jihad` deployment to the previous one. The schema stays (forward-only), and the old code works with it. Stop the chain.
- Independent safe work continues. `REAL_CLIENT_DATA_ALLOWED` stays **NO**; this window does not change it.

## Evidence on the PR branches (local, fresh disposable DBs, 2026-10-13)

| PR | Gate | Integration | Full API | Notes |
|---|---|---|---|---|
| #36 | 308/308 | 293/293 | 0 failures | all four re-merged with main and re-measured 2026-10-13 22:xx |
| #38 | 308/308 | 294/294 | 0 failures | |
| #26 | 312/312 | 291/291 | 0 failures | |
| #65 | 308/308 | 300/300 (incl. invites 15/15 with CLIENT invites, customers 9/9) | 0 failures | CLIENT invites (4/4 mutations caught); isolation 80/80 before and after the fill-in |

## Decision requested (one)

Approve the window as above: steps 1 → 5 in order, each behind its own fresh verified backup, each step's code deployed only after its migration is verified, and the chain stopping on the first failure.
