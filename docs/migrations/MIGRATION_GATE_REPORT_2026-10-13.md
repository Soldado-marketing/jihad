# Migration Gate Report: #36 → #38 → #26 → #65 (2026-10-13)

**Status: PREPARED, NOT APPLIED. Independently re-audited 2026-10-14 (see "Audit 2026-10-14"). One owner approval covers this report. Each migration still gets its own fresh, verified backup immediately before it is applied.**

This supersedes the procedure in `MIGRATION_GATE_REPORT_2026-10-11.md`, which stays as history (it applied three migrations in one `migrate deploy`). The owner's order and rule of 2026-10-13 apply: one migration at a time, each with a fresh backup, sha256 check, `pg_restore --list` and prechecks.

## Production state (read-only, 2026-10-13 21:2x UTC; re-checked 2026-10-14 with the same results)

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
| 1 | #36 T40 | `20261011085435_revenue_record_unique_invoice` | `CREATE UNIQUE INDEX "RevenueRecord_tenantId_invoiceId_key" ON "RevenueRecord"("tenantId","invoiceId")` | none | write lock on RevenueRecord during build (1 row: ms) | No crash either way, but only the index stops duplicates; precheck immediately before apply, writes frozen |
| 2 | #38 D16b | `20261011090404_payment_idempotency_key` | `ALTER TABLE "Payment" ADD COLUMN "idempotencyKey" TEXT`; `CREATE UNIQUE INDEX "Payment_tenantId_idempotencyKey_key" ON "Payment"("tenantId","idempotencyKey")` | none (2 rows read NULL; no rewrite) | brief exclusive lock (catalog-only column) + ms index build | **Yes**, see below |
| 3 | #26 T44 | `20261010134025_add_email_delivery_tracking` | enum `EmailDeliveryStatus` (6 values); tables `EmailMessage`, `EmailEvent`; unique `EmailMessage.providerMessageId`; indexes `(tenantId, resourceType, resourceId)`, `(emailMessageId, occurredAt)`, `EmailEvent(tenantId)`; FKs → `Tenant`, → `EmailMessage` (CASCADE) | none | new objects; brief share lock on `Tenant` for the FK | **Yes** |
| 4 | #65 T50 | `20261013123256_add_customer` | enum `CustomerStatus`; table `Customer` (`UNIQUE(tenantId, clientScopeKey)`); nullable `customerId` on `Project`, `Invoice`, `FileAsset` + `(tenantId, customerId)` indexes; FKs `ON DELETE NO ACTION` | none (new columns NULL) | catalog-only columns; ms index builds; FK validation over NULLs | **Yes** |
| 5 | #65 F2b | `20261013212118_add_invite_customer` | nullable `Invite.customerId` + index + FK → `Customer` (`NO ACTION`) | none | catalog-only; 0 invite rows | **Yes** (same PR as step 4) |

**Expected downtime: none.** No migration rewrites a table or touches existing values, and the API keeps serving throughout.

### Why the order is migration → then code (and never the reverse)

- **#38:** the new code adds `idempotencyKey` to the Payment model. Without the column: **recording any payment fails** (`payment.create` returns every scalar column), the replay lookup (`findFirst` by `idempotencyKey`) fails, and so does any payment read without an explicit `select`. Payment lists with an explicit `select` keep working. *(Corrected 2026-10-14: an earlier version said "every payment read" would fail.)* Rehearsal: #38's payment suites on the old schema, **16 of 21 failed**. The migration must be applied and verified **before** #38 is merged/deployed.
- **#26:** the invoice-send path writes `EmailMessage` rows inside `try/catch` (`trackDeliveries` logs and continues; test "never fails a send because tracking failed"), so sending stays safe. But `GET /invoices/:id/deliveries` reads the table and would answer 500; rehearsal: the deliveries suite could not even start on the old schema. So: migration first, then the code.
- **#65:** Project, Invoice and FileAsset gain `customerId` in the model, so the default selects on projects, invoices and files would fail without the columns, and the `/customers` routes need the table. Rehearsal: #65's suites on the old schema, **22 of 24 failed**. Migration first, then the code. Both #65 migrations run before #65 is merged.
- **#36:** the code (P2002 handling) does not crash with or without the index, but **only the index prevents duplicate revenue rows**. Until it exists, production code can still create a duplicate `(tenantId, invoiceId)` under a concurrent double post (reproduced in the 2026-10-14 rehearsal), which would make the index build fail. Therefore the #36 precheck runs **immediately** before the apply, with writes frozen.
- Old code on any new schema works: every change is additive and unused by old code. This is what makes "migration first" safe.

## Per-migration procedure (repeat for steps 1 → 5; stop the chain on any failure)

Run from a dedicated local checkout of the step's PR branch, **re-merged with `main` after the previous step's PR was merged** (merge commit, no rebase; CI green on the PR before continuing). It must contain exactly the migration folders applied so far plus this step's folder. Never pass credentials on a command line.

- **Expected re-merge conflicts:** `.github/workflows/ci.yml` on #38, #26 and #65 (test lists and count comments: keep both sides). **#65 also conflicts with #26 in `apps/api/prisma/schema.prisma`**: both add one relation line to `model Tenant` (`emailMessages EmailMessage[]` and `customers Customer[]`); keep both lines. Neither conflict touches a migration file.
- **Steps 4 and 5 (#65's two migrations):** step 4 runs from a local copy of the #65 checkout with the folder `20261013212118_add_invite_customer` removed (not committed), so that only `add_customer` is applied; step 5 runs from the full checkout. Each gets its own fresh backup. #65's code is deployed only after step 5.

1. **Docker check:** `docker info` succeeds (lesson of 2026-10-13: the dump and rehearsal need Docker). Freeze merges to `main`.
2. **Fresh backup, just for this migration:** `caffeinate -i ~/MAOS_BACKUPS/runtime/current/scripts/nightly-backup.sh` with `MAOS_BACKUP_CREDENTIAL_SOURCE=keychain`. Expect `SUCCESS` and a new `maos-<UTC>.dump` with `.dump.sha256`. **Never reuse the backup of a previous step.**
3. **sha256:** recompute with `shasum -a 256 <dump>` and compare with the `.sha256` file. Must match.
4. **`pg_restore --list`:** run it in `postgres:18` against the dump. The entry count must be non-zero and every table present (the last run had 429 entries / 43 tables).
5. **Isolated rehearsal:** `~/MAOS_BACKUPS/runtime/current/scripts/restore-rehearsal.sh <dump>` → `REHEARSAL OK`. This never touches production.
6. **Prechecks (read-only session):** `_prisma_migrations` = expected count with none failed, and this step's objects absent. Step-specific checks:
   - **#36:** duplicate-group query → must be **0**, run immediately before step 7 with writes frozen: `SELECT count(*) FROM (SELECT "tenantId","invoiceId" FROM "RevenueRecord" WHERE "invoiceId" IS NOT NULL GROUP BY 1,2 HAVING count(*)>1) d;`
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
- **`migrate deploy` fails (step 7):** (rehearsed 2026-10-14: a duplicate made the #36 index build fail with P3018; no partial index remained; Prisma then refused every later migration with P3009, so the chain stops by itself; old code kept serving, health 200)
  1. Stop the chain and **do not deploy that step's code**.
  2. No destructive rollback and no `DROP`. Preserve the evidence: `migrate status` output, `_prisma_migrations` row, server log.
  3. Production keeps running the old code, which ignores the new objects.
  4. A partly created **new** object is inspected and handled only with a new owner decision (`prisma migrate resolve` is an owner-approved step).
  5. The step's fresh backup is the recovery point, needed only if existing data were affected. That isn't expected: no statement in these migrations updates rows.
- **The step's code misbehaves after deploy (step 9):** roll back the Railway `jihad` deployment to the previous one. The schema stays (forward-only), and the old code works with it. Stop the chain.
- Independent safe work continues. `REAL_CLIENT_DATA_ALLOWED` stays **NO**; this window does not change it.

## Audit 2026-10-14 (independent re-check of the real state)

- **Heads:** #36 `1b84035`, #38 `81b53f8`, #26 `2f73cf4`, #65 `adb341e`. All four are current with `main` `c86ca48`, GitHub CI SUCCESS on every head, MERGEABLE; #65 is a draft.
- **Migration files at those heads:** exactly one folder each (#65: two). Every statement is `CREATE TYPE/TABLE/INDEX` or `ALTER TABLE … ADD COLUMN/ADD CONSTRAINT`. **No UPDATE, DELETE, DROP, RENAME, ALTER COLUMN or SET NOT NULL**, and no added column is NOT NULL or has a default. No existing row is modified, and no data can be lost.
- **Production prechecks (read-only, 2026-10-14):**
  - 8 migrations, none failed;
  - **#36 duplicate groups = 0** (1 RevenueRecord row, 0 with NULL invoiceId);
  - every new object absent;
  - 0 client keys;
  - 3 connections, 0 long transactions.
- **Full sequential rehearsal** on one disposable **PostgreSQL 18** database (production's version), with the same merge and migration order as production:
  - main's 686 tests seeded realistic data first (36 tenants, invoices, payments, revenue, client-scoped rows);
  - each step: precheck immediately before apply → apply that step only → **old code on the new schema: 0 failures** → new code: 0 failures → app boot health 200/200;
  - totals: #36 681 pass, #38 687, #26 694, #65 706, all 0 failures (10 todo each);
  - after #65: fill-in dry run → apply (10 customers created, 33 rows linked) → re-apply 0/0; **0 invariant violations, 0 keyed rows left unlinked, isolation suites 100/100**;
  - no unvalidated constraints or invalid indexes at any point; final `migrate status`: up to date.
- **Corrections to this report found by the audit:** the #38 wording, the #36 duplicate race and precheck timing, the #65/#26 `schema.prisma` re-merge conflict, the two-step #65 procedure, and the test counts below.

## Evidence on the PR branches (local, fresh disposable DBs; re-measured 2026-10-13/14)

| PR | Gate | Integration | Full API | Notes |
|---|---|---|---|---|
| #36 | 323/323 | 293/293 | 0 failures | one integration flake in one run; 258/258 twice on re-run |
| #38 | 323/323 | 294/294 | 0 failures | |
| #26 | 327/327 | 291/291 | 0 failures | |
| #65 | 323/323 | 300/300 (incl. invites 15/15 with CLIENT invites, customers 9/9) | 0 failures | CLIENT invites (4/4 mutations caught); isolation 80/80 before and after the fill-in |

## Decision requested (one)

Approve the window as above: steps 1 → 5 in order, each behind its own fresh verified backup, each step's code deployed only after its migration is verified, and the chain stopping on the first failure.
