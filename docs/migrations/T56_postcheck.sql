-- MAOS-T56 postcheck (read-only). Run: scripts/db-readonly-check.sh docs/migrations/T56_postcheck.sql
\pset footer off
SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS finished, count(*) FILTER (WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL) AS failed FROM "_prisma_migrations";
SELECT migration_name, finished_at IS NOT NULL AS finished FROM "_prisma_migrations" WHERE migration_name='20261014155254_project_enrichment';
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='Project' AND column_name IN ('serviceType','budgetCents','deadline','ownerUserId','projectNumber') ORDER BY 1;
SELECT indexname FROM pg_indexes WHERE indexname IN ('Project_tenantId_ownerUserId_idx','Project_tenantId_deadline_idx','Project_tenantId_projectNumber_key') ORDER BY 1;
SELECT conname, confdeltype, convalidated FROM pg_constraint WHERE conname='Project_ownerUserId_fkey';
SELECT count(*) AS invalid_indexes FROM pg_index WHERE NOT indisvalid;
SELECT count(*) AS rows_with_new_values FROM "Project" WHERE "serviceType" IS NOT NULL OR "budgetCents" IS NOT NULL OR "deadline" IS NOT NULL OR "ownerUserId" IS NOT NULL OR "projectNumber" IS NOT NULL;
SELECT (SELECT count(*) FROM "Project") AS projects, (SELECT count(*) FROM "User") AS users, (SELECT count(*) FROM "Task") AS tasks, (SELECT count(*) FROM "TenantMembership") AS memberships, (SELECT count(*) FROM "Customer") AS customers, (SELECT max("updatedAt") FROM "Project") AS project_max_updated;
