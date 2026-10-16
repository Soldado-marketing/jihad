-- MAOS-T71 precheck (read-only). Run: scripts/db-readonly-check.sh docs/migrations/T71_precheck.sql
\pset footer off
SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS finished, count(*) FILTER (WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL) AS failed FROM "_prisma_migrations";
SELECT count(*) AS t71_tables_present FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('TimeEntry', 'Rate');
SELECT count(*) AS t71_types_present FROM pg_type WHERE typname IN ('TimeEntryStatus', 'RateScope');
SELECT (SELECT count(*) FROM "Tenant") AS tenants, (SELECT count(*) FROM "User") AS users, (SELECT count(*) FROM "Project") AS projects, (SELECT count(*) FROM "Task") AS tasks, (SELECT count(*) FROM "Customer") AS customers;
SELECT count(*) AS long_xacts FROM pg_stat_activity WHERE datname = current_database() AND state <> 'idle' AND xact_start < now() - interval '1 minute';
SELECT current_setting('server_version') AS server_version, current_setting('transaction_read_only') AS read_only;
