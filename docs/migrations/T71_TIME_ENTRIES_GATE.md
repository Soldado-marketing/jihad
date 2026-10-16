# Migration gate: time entries and rates (MAOS-T71)

Status: **GATED. Do not merge or apply without the owner's migration approval.**
Branch: `schema/time-entries`. Prepared 2026-10-16. Design: ADR-018 (accepted 2026-10-11; open questions answered with the ADR's proposals in the decision sheet of 2026-10-13, item 7). Procedure: the stable operator procedure of `T56_PROJECT_ENRICHMENT_GATE.md` ("Operator procedure"), with the T71 file names below.

## Why a migration

ADR-018 and Blueprint §15 need a canonical `TimeEntry` with a rate frozen on each entry, and effective-dated `Rate` rows for resolution. Nothing existing can hold them: `CostRecord` is a manual cost, and time fields on `Task` are excluded by the Blueprint (§12). No API or UI is part of T71 (that is T72-T76).

## The migration

`20261016133407_time_entries_and_rates`, generated with `prisma migrate diff` (no drift afterwards: "No difference detected"), plus CHECK constraints that Prisma cannot model. **Additive only: two new enums and two new tables. No existing table, column or row is changed.** This is the amended version after the first audit (see "Audit history").

`shasum -a 256 apps/api/prisma/migrations/20261016133407_time_entries_and_rates/migration.sql`:
`489d6f63618edf030928de00039e532fcf0de1d3f6077ee7a6f1bc824b93fd7f`

| Object | Content |
|---|---|
| enum `TimeEntryStatus` | DRAFT, SUBMITTED, APPROVED, BILLED, REJECTED |
| enum `RateScope` | MEMBER, ROLE, TENANT |
| table `TimeEntry` | tenantId, userId, date (DATE), minutes, projectId, taskId?, customerId?, billable (default true), note?, status (default DRAFT), frozen rateCents?, rateSource?, currency?, costCents?, createdByUserId?, timestamps |
| table `Rate` | tenantId, scope, scopeKey, userId?, role?, rateCents, currency (default EUR), validFrom (DATE), createdByUserId?, timestamps |
| 7 indexes | TimeEntry (tenant, user, date), (tenant, project, date), (tenant, task), (tenant, customer), (tenant, status); Rate **unique** (tenant, scopeKey, validFrom), (tenant, user, validFrom) |
| FKs | tenant `CASCADE` (both); member and project `NO ACTION`; task and customer `SET NULL`; Rate member `NO ACTION` |
| 7 CHECKs | `TimeEntry_minutes_check` 1-1440; `TimeEntry_cents_check` cents >= 0; `TimeEntry_frozen_rate_check` rate, source, currency and cost all set, or rate, source and cost all null ("unrated", ADR-018 §2); `TimeEntry_cost_formula_check` costCents = (minutes × rateCents + 30) / 60 in bigint (ADR-018 §4); `Rate_rateCents_check` >= 0; `Rate_scope_check` MEMBER = member and no role, ROLE = internal role (not CLIENT) and no member, TENANT = neither; `Rate_scope_key_check` scopeKey = `TENANT`, `ROLE:<role>` or `MEMBER:<userId>` for that row |

All money is integer cents (Blueprint §5.5). `date` and `validFrom` are calendar dates, so an entry's day never shifts with a time zone.

### Rate uniqueness (one rate per workspace, target and day)

ADR-018 needs a single, deterministic rate per resolution step. `userId` and `role` are nullable, and a unique index over nullable columns treats NULLs as distinct, so it would admit two workspace-wide rates for the same day. Instead of `NULLS NOT DISTINCT` or partial indexes (which Prisma cannot represent, so they would show as drift), `Rate` carries a NOT NULL `scopeKey` that names the target: `TENANT`, `ROLE:<role>` or `MEMBER:<userId>`. The ordinary Prisma `@@unique([tenantId, scopeKey, validFrom])` then admits exactly one rate per workspace, target and day, and `Rate_scope_key_check` keeps `scopeKey` equal to the row's scope, role and member (`IS NOT DISTINCT FROM`, so a missing role or member makes the check false rather than NULL). The API (T73) sets `scopeKey`; the database refuses any other value.

### Cost formula

`TimeEntry_cost_formula_check`: a rated entry's `costCents` must equal `(minutes::bigint × rateCents::bigint + 30) / 60`. All values are non-negative (other CHECKs), and for non-negative integers that integer division is exactly round-half-up of `minutes × rateCents / 60`, the formula in ADR-018 §4. The bigint cast keeps `1440 × rateCents` from overflowing integer arithmetic (tested with 1440 × 2 000 000). Unrated entries (rate and cost null) are not affected; partial states stay refused by `TimeEntry_frozen_rate_check`.

### FK choices

- **Member and project: NO ACTION.** Logged time is cost history, so a project or member with time entries cannot be deleted; the check runs at the end of the statement, as for the existing customer links (`NoAction`), so deleting a whole tenant still removes everything. RESTRICT also passed the rehearsal; NO ACTION is the more tolerant of cascade order. **Behaviour note for T72:** `DELETE /projects/:id` on a project with time entries will be refused by the database; T72 must answer that with a clear 409 instead of a 500. Until T72 there are no entries, so nothing changes.
- **Task: SET NULL.** Deleting a task keeps its time (the entry stays on the project).
- **Customer: SET NULL.** As the other customer links (ADR-017); customers are archived, not deleted.

## Code ordering

No code reads or writes the new tables yet. The current code runs unchanged on the new schema (rehearsed below), and a build with the new Prisma client runs unchanged on the old schema because nothing queries the new models. Standard order anyway: **migration first, then merge** this PR (schema + tests only).

## Evidence (disposable databases only)

- `time-entry-schema` 10/10 on PostgreSQL 18: unrated and frozen entries; minutes bounds; negative cents; four half-frozen variants refused; rate scope shapes (six invalid refused, CLIENT role refused); **one rate per workspace / role / member and day** (a second rate with the same key refused at every scope; other days, roles, members and workspaces allowed); **scopeKey must name the target** (six wrong keys refused); **cost formula** (60 × 3000 = 3000, 1 × 3000 = 50, 7 × 1999 = 233, half-up boundaries 0.48 → 0, 0.5 → 1, 1.48 → 1, 1.5 → 2, wrong costs refused, 1440 × 2 000 000 = 48 000 000 without overflow); project and member with entries or rates cannot be deleted; deleted task detaches its entries; tenant delete removes entries and rates.
- Mutations (fresh database each, baseline unchanged 10/10): removing the unique rate key, the cost formula, `+ 30` (truncation instead of half-up), the bigint casts (integer overflow), the scope-key check, the minutes check, the frozen-rate check or the scope check, or making the project FK CASCADE, each fails the suite (9/9). RESTRICT instead of NO ACTION passes (documented above).
- Current code on the new schema, CI sequence, **PostgreSQL 16 and 18**: integration-api 35/35, the other 33 suites 329/329, full API 461 / 0 fail / 10 todo; blocking gate 351/351.
- `prisma migrate diff` from the migrations to the schema: **No difference detected**.

## Production precheck (read-only, 2026-10-16, rerun after the amendment)

`scripts/db-readonly-check.sh docs/migrations/T71_precheck.sql`: **14 finished / 0 failed**; T71 tables 0, T71 types 0; 1 tenant, 2 users, 1 project, 1 task, 0 customers; 0 long transactions; PostgreSQL 18.6; session read-only.

## Procedure (owner window)

As the T56 operator procedure, with:

1. `docker info`; fresh backup (`MAOS_BACKUP_CREDENTIAL_SOURCE=keychain caffeinate -i scripts/nightly-backup.sh`), sha256, `pg_restore --list`, `scripts/restore-rehearsal.sh <dump>` → `REHEARSAL OK`.
2. `scripts/db-readonly-check.sh docs/migrations/T71_precheck.sql` → 14 / 0, tables 0, types 0.
3. Clean worktree of the approved PR head: `scripts/migrate-deploy-one.sh check 20261016133407_time_entries_and_rates 489d6f63618edf030928de00039e532fcf0de1d3f6077ee7a6f1bc824b93fd7f` → `CHECK OK`.
4. **Owner-approved write:** the same with `apply` → `APPLY OK`.
5. `scripts/db-readonly-check.sh docs/migrations/T71_postcheck.sql` → 15 / 0; both tables; enum values; **7 FKs and 7 CHECKs**; **9 indexes** on the two tables (2 primary keys + 7, of which `Rate_tenantId_scopeKey_validFrom_key` unique = 1); 0 invalid indexes; 0 entries, 0 rates; existing counts unchanged; health 200/200.
6. Merge this PR; main CI, Railway `jihad` SUCCESS, health and logs.

Containment unchanged: any refusal or failure stops the window; no destructive rollback and no `migrate resolve` without the owner. A failed apply leaves no partial object (one transaction per migration file).

## Audit history

- **First audit (2026-10-16): NOT SAFE TO APPROVE** for the first draft, sha256 `9522fb633c1a31cffdaf7b625f3e12449995149692feaecbeb5bcc21eac4d441` (2 enums, 2 tables, 7 indexes, 7 FKs, 5 CHECKs). Shown on a disposable database: (1) two `Rate` rows with the same workspace, scope target and `validFrom` were accepted at every scope, so ADR-018's deterministic resolution was not guaranteed; (2) a rated entry's `costCents` was not tied to the ADR-018 formula (60 minutes at 3000 cents/h stored with cost 1).
- **Amendment (2026-10-16):** the same migration file was amended rather than adding a corrective migration, because the first draft had never been applied to a persistent database: production precheck showed no T71 objects; Railway has only the production environment and deploys do not run migrations; the local development database has no T71 row; every other database was disposable (rehearsal containers, CI). Added `Rate.scopeKey` + unique key + `Rate_scope_key_check` (replacing the plain `(tenant, scope, validFrom)` index) and `TimeEntry_cost_formula_check`. New sha256 `489d6f63618edf030928de00039e532fcf0de1d3f6077ee7a6f1bc824b93fd7f`; 7 FKs, 7 CHECKs, 9 indexes.

## After T71

T72 (TimeEntry API, `TIME_ENTRY` resource in every role policy), T73 (rate resolution and freezing, `RATE` sensitive; sets `Rate.scopeKey` and stores `costCents` by the same formula), T74 (labour cost in profitability) need no further migration. Approvers (ADR-018 open question 1): MANAGER or OWNER. Submission: per entry. Non-billable time counts as cost. Default rates are set by the OWNER.
