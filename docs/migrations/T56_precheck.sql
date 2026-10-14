-- MAOS-T56 precheck (read-only). Run: scripts/db-readonly-check.sh docs/migrations/T56_precheck.sql
\pset footer off
SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS finished, count(*) FILTER (WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL) AS failed FROM "_prisma_migrations";
SELECT count(*) AS t56_columns_present FROM information_schema.columns WHERE table_name='Project' AND column_name IN ('serviceType','budgetCents','deadline','ownerUserId','projectNumber');
SELECT count(*) AS t56_indexes_present FROM pg_indexes WHERE indexname IN ('Project_tenantId_ownerUserId_idx','Project_tenantId_deadline_idx','Project_tenantId_projectNumber_key');
SELECT count(*) AS projects, pg_size_pretty(pg_total_relation_size('"Project"')) AS project_table_size FROM "Project";
SELECT count(*) AS long_xacts FROM pg_stat_activity WHERE datname=current_database() AND state <> 'idle' AND xact_start < now() - interval '1 minute';
SELECT current_setting('server_version') AS server_version, current_setting('transaction_read_only') AS read_only;
SELECT (SELECT count(*) FROM "Project") AS projects, (SELECT count(*) FROM "User") AS users, (SELECT count(*) FROM "Task") AS tasks, (SELECT count(*) FROM "TenantMembership") AS memberships, (SELECT count(*) FROM "Customer") AS customers, (SELECT max("updatedAt") FROM "Project") AS project_max_updated;
