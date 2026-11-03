# PostgreSQL least-privilege plan (B03)

Status: DESIGN, not applied. Applying it creates roles in the production database and changes `DATABASE_URL` on Railway service `jihad`: both are owner actions inside an approved window, after a fresh verified backup. Nothing in this document is a secret; every password is chosen inside the database session and never written down.

## Today

- One database role (Railway's default administrator) is used by the API at runtime, by `scripts/migrate-deploy-one.sh` for approved migrations, and by the nightly backup (`scripts/nightly-backup.sh` through the private tunnel, credential in the macOS Keychain, MAOS-T18/R01).
- The public TCP proxy was removed after the 2026-10-21 Railway disclosure; connections go through Railway's private network or the SSH tunnel (#121).
- The API performs no DDL at runtime. Raw SQL in `apps/api/src` is DML only: `SELECT 1` (health), `SELECT … FOR UPDATE` (payments), `pg_try_advisory_xact_lock` (scheduler), `UPDATE` (customer link), `SELECT` (customer backfill). Prisma Client needs the tables, sequences and `pg_catalog` reads only.

Risk being reduced: a compromised API process or leaked runtime credential today can drop tables, alter the schema and read `_prisma_migrations`; a leaked backup credential can write.

## Target

| Role | Used by | Privileges |
|---|---|---|
| `postgres` (existing administrator, owner of all objects) | `migrate-deploy-one.sh` only, inside migration windows | unchanged |
| `maos_app` (new, `LOGIN`, `NOINHERIT` not required) | API runtime (`DATABASE_URL` on `jihad`), `backfill-customers.cli.ts` | `USAGE` on schema `public`; `SELECT, INSERT, UPDATE, DELETE` on all tables; `USAGE, SELECT` on all sequences; the same by default on future tables and sequences created by `postgres`; **no** `CREATE`, no ownership |
| `maos_backup` (new, `LOGIN`) | nightly `pg_dump` and restore rehearsal source | `pg_read_all_data` (PostgreSQL ≥ 14 predefined role) |

Connection limits: `maos_app` `CONNECTION LIMIT 40` (Prisma pool default is `num_cpus × 2 + 1` per instance; one Railway replica today), `maos_backup` `CONNECTION LIMIT 3`.

## SQL (run as `postgres` through the private tunnel; passwords set interactively with `\password`, never in the script)

```sql
-- 1. roles (no password in the file: run \password maos_app and \password maos_backup afterwards)
CREATE ROLE maos_app    LOGIN CONNECTION LIMIT 40;
CREATE ROLE maos_backup LOGIN CONNECTION LIMIT 3;

-- 2. runtime role: DML on everything that exists today
GRANT CONNECT ON DATABASE railway TO maos_app;          -- database name as on Railway
GRANT USAGE ON SCHEMA public TO maos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO maos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO maos_app;
REVOKE ALL ON TABLE public."_prisma_migrations" FROM maos_app;
GRANT SELECT ON TABLE public."_prisma_migrations" TO maos_app;   -- read only: `prisma migrate status` style checks, never writes

-- 3. and on everything future migrations (run as postgres) will create
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO maos_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO maos_app;

-- 4. backup role
GRANT CONNECT ON DATABASE railway TO maos_backup;
GRANT pg_read_all_data TO maos_backup;

-- 5. close the door PUBLIC still has on the schema (PostgreSQL 15+ already restricts CREATE)
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
```

Verification queries after step 5 (read-only):

```sql
SELECT rolname, rolcanlogin, rolconnlimit FROM pg_roles WHERE rolname IN ('maos_app','maos_backup');
SELECT grantee, privilege_type, count(*) FROM information_schema.role_table_grants
 WHERE grantee IN ('maos_app','maos_backup') GROUP BY 1,2 ORDER BY 1,2;
SELECT has_schema_privilege('maos_app','public','CREATE');   -- must be false
```

## Rehearsal (required before the owner window)

On a disposable PostgreSQL 18 container with the full migration history applied as the administrator:

1. Run the SQL above; set throw-away passwords.
2. Start the API with `DATABASE_URL` for `maos_app`; run `integration-api` and the security suites (`apps/api/test/*.test.mjs` list from `ci.yml`): all green, and the API log shows no `permission denied`.
3. Run the scheduler once (`MAOS_SCHEDULER_ENABLED=true`): advisory lock taken, jobs succeed.
4. `pg_dump` with `maos_backup` → `pg_restore --list` → isolated restore: identical table count (48) and row counts to a dump taken as the administrator.
5. Negative checks as `maos_app`: `CREATE TABLE x()` → permission denied; `DROP TABLE "Tenant"` → must be denied (not owner); `INSERT INTO "_prisma_migrations"` → denied. As `maos_backup`: any `INSERT` → denied.
6. Apply one new throw-away migration as the administrator afterwards and confirm `maos_app` can read and write the new table without a new GRANT (default privileges work).

Record the results in `docs/MAOS_PROGRESS.md`.

## Production window (owner)

1. Fresh backup, sha256, `pg_restore --list`, REHEARSAL OK (standard gate).
2. SQL steps 1–5 through the private tunnel as `postgres`; passwords with `\password` only; verification queries.
3. Railway: set `DATABASE_URL` on `jihad` to the `maos_app` URL (same host, database and `sslmode`), redeploy, readiness 200, logs without `permission denied`, one authenticated smoke by the owner.
4. Keychain: replace the backup credential with the `maos_backup` URL; run `launchctl kickstart … com.soldado.maos.backup`; SUCCESS + rehearsal OK.
5. `migrate-deploy-one.sh` keeps the administrator credential (Keychain item of its own) and is used only in windows.

## Rollback

Set `DATABASE_URL` back to the administrator URL and redeploy (one Railway change). Roles can stay; nothing in the schema changed. Backups: switch the Keychain item back.

## Out of scope

Row-level security (tenant isolation stays in the application and its CI suites), separate schemas per company, and rotating the administrator password (that rotation happened 2026-10-31).
