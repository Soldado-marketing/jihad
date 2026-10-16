-- MAOS-T71 post-apply verification (read-only). Run: scripts/db-readonly-check.sh docs/migrations/T71_postcheck.sql
\pset footer off
SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS finished, count(*) FILTER (WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL) AS failed FROM "_prisma_migrations";
SELECT migration_name, finished_at IS NOT NULL AS finished FROM "_prisma_migrations" WHERE migration_name = '20261016133407_time_entries_and_rates';
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('TimeEntry', 'Rate') ORDER BY 1;
SELECT typname, array_to_string(enum_range(NULL::"TimeEntryStatus")::text[], ',') AS values FROM pg_type WHERE typname = 'TimeEntryStatus';
SELECT conname, contype, confdeltype FROM pg_constraint WHERE conrelid IN ('"TimeEntry"'::regclass, '"Rate"'::regclass) AND contype IN ('f', 'c') ORDER BY 1;
SELECT count(*) AS t71_indexes FROM pg_indexes WHERE tablename IN ('TimeEntry', 'Rate');
SELECT count(*) AS invalid_indexes FROM pg_index WHERE NOT indisvalid;
SELECT (SELECT count(*) FROM "TimeEntry") AS time_entries, (SELECT count(*) FROM "Rate") AS rates;
SELECT (SELECT count(*) FROM "Tenant") AS tenants, (SELECT count(*) FROM "User") AS users, (SELECT count(*) FROM "Project") AS projects, (SELECT count(*) FROM "Task") AS tasks, (SELECT count(*) FROM "Customer") AS customers;
