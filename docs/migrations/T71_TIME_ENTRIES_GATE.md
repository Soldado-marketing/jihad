# Migration gate: time entries and rates (MAOS-T71)

Status: **GATED. Do not merge or apply without the owner's migration approval.**
Branch: `schema/time-entries`. Prepared 2026-10-16. Design: ADR-018 (accepted 2026-10-11; open questions answered with the ADR's proposals in the decision sheet of 2026-10-13, item 7). Procedure: the stable operator procedure of `T56_PROJECT_ENRICHMENT_GATE.md` ("Operator procedure"), with the T71 file names below.

## Why a migration

ADR-018 and Blueprint §15 need a canonical `TimeEntry` with a rate frozen on each entry, and effective-dated `Rate` rows for resolution. Nothing existing can hold them: `CostRecord` is a manual cost, and time fields on `Task` are excluded by the Blueprint (§12). No API or UI is part of T71 (that is T72-T76).

## The migration

`20261016133407_time_entries_and_rates`, generated with `prisma migrate diff` (no drift afterwards: "No difference detected"), plus CHECK constraints that Prisma cannot model. **Additive only: two new enums and two new tables. No existing table, column or row is changed.**

`shasum -a 256 apps/api/prisma/migrations/20261016133407_time_entries_and_rates/migration.sql`:
`9522fb633c1a31cffdaf7b625f3e12449995149692feaecbeb5bcc21eac4d441`

| Object | Content |
|---|---|
| enum `TimeEntryStatus` | DRAFT, SUBMITTED, APPROVED, BILLED, REJECTED |
| enum `RateScope` | MEMBER, ROLE, TENANT |
| table `TimeEntry` | tenantId, userId, date (DATE), minutes, projectId, taskId?, customerId?, billable (default true), note?, status (default DRAFT), frozen rateCents?, rateSource?, currency?, costCents?, createdByUserId?, timestamps |
| table `Rate` | tenantId, scope, userId?, role?, rateCents, currency (default EUR), validFrom (DATE), createdByUserId?, timestamps |
| 7 indexes | TimeEntry (tenant, user, date), (tenant, project, date), (tenant, task), (tenant, customer), (tenant, status); Rate (tenant, scope, validFrom), (tenant, user, validFrom) |
| FKs | tenant `CASCADE` (both); member and project `NO ACTION`; task and customer `SET NULL`; Rate member `NO ACTION` |
| CHECKs | `TimeEntry_minutes_check` 1-1440; `TimeEntry_cents_check` cents >= 0; `TimeEntry_frozen_rate_check` rate, source, currency and cost all set, or rate, source and cost all null ("unrated", ADR-018 §2); `Rate_rateCents_check` >= 0; `Rate_scope_check` MEMBER = member and no role, ROLE = internal role (not CLIENT) and no member, TENANT = neither |

All money is integer cents (Blueprint §5.5). `date` and `validFrom` are calendar dates, so an entry's day never shifts with a time zone.

### FK choices

- **Member and project: NO ACTION.** Logged time is cost history, so a project or member with time entries cannot be deleted; the check runs at the end of the statement, as for the existing customer links (`NoAction`), so deleting a whole tenant still removes everything. RESTRICT also passed the rehearsal; NO ACTION is the more tolerant of cascade order. **Behaviour note for T72:** `DELETE /projects/:id` on a project with time entries will be refused by the database; T72 must answer that with a clear 409 instead of a 500. Until T72 there are no entries, so nothing changes.
- **Task: SET NULL.** Deleting a task keeps its time (the entry stays on the project).
- **Customer: SET NULL.** As the other customer links (ADR-017); customers are archived, not deleted.

## Code ordering

No code reads or writes the new tables yet. The current code runs unchanged on the new schema (rehearsed below), and a build with the new Prisma client runs unchanged on the old schema because nothing queries the new models. Standard order anyway: **migration first, then merge** this PR (schema + tests only).

## Evidence (disposable databases only)

- `time-entry-schema` 7/7 on PostgreSQL 18: unrated and frozen entries; minutes bounds; negative cents; four half-frozen variants refused; rate scope shapes (six invalid refused, CLIENT role refused); project and member with entries cannot be deleted; deleted task detaches its entries; tenant delete removes entries and rates.
- Mutations: removing the minutes, frozen-rate or scope CHECK, or making the project FK CASCADE, each fails the suite (4/4). RESTRICT instead of NO ACTION passes (documented above).
- Current code on the new schema, CI sequence, **PostgreSQL 16 and 18**: integration-api 35/35, the other 33 suites 326/326, full API 461 / 0 fail / 10 todo.

## Production precheck (read-only, 2026-10-16)

`scripts/db-readonly-check.sh docs/migrations/T71_precheck.sql`: **14 finished / 0 failed**; T71 tables 0, T71 types 0; 1 tenant, 2 users, 1 project, 1 task, 0 customers; 0 long transactions; PostgreSQL 18.6; session read-only.

## Procedure (owner window)

As the T56 operator procedure, with:

1. `docker info`; fresh backup (`MAOS_BACKUP_CREDENTIAL_SOURCE=keychain caffeinate -i scripts/nightly-backup.sh`), sha256, `pg_restore --list`, `scripts/restore-rehearsal.sh <dump>` → `REHEARSAL OK`.
2. `scripts/db-readonly-check.sh docs/migrations/T71_precheck.sql` → 14 / 0, tables 0, types 0.
3. Clean worktree of the approved PR head: `scripts/migrate-deploy-one.sh check 20261016133407_time_entries_and_rates 9522fb633c1a31cffdaf7b625f3e12449995149692feaecbeb5bcc21eac4d441` → `CHECK OK`.
4. **Owner-approved write:** the same with `apply` → `APPLY OK`.
5. `scripts/db-readonly-check.sh docs/migrations/T71_postcheck.sql` → 15 / 0; both tables; enum values; 7 FKs and 5 CHECKs; 9 indexes on the two tables (2 primary keys + 7); 0 invalid indexes; 0 entries, 0 rates; existing counts unchanged; health 200/200.
6. Merge this PR; main CI, Railway `jihad` SUCCESS, health and logs.

Containment unchanged: any refusal or failure stops the window; no destructive rollback and no `migrate resolve` without the owner. A failed apply leaves no partial object (one transaction per migration file).

## After T71

T72 (TimeEntry API, `TIME_ENTRY` resource in every role policy), T73 (rate resolution and freezing, `RATE` sensitive), T74 (labour cost in profitability) need no further migration. Approvers (ADR-018 open question 1): MANAGER or OWNER. Submission: per entry. Non-billable time counts as cost. Default rates are set by the OWNER.
