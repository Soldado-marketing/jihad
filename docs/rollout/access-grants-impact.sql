-- MAOS access grants (PR #124): who changes access when the PR is deployed.
--
-- READ-ONLY by three independent layers:
--   1. scripts/db-readonly-check.sh starts psql with
--      PGOPTIONS='-c default_transaction_read_only=on';
--   2. everything below runs inside BEGIN ... READ ONLY and ends in ROLLBACK;
--   3. section 0 aborts (division by zero, ON_ERROR_STOP) unless PostgreSQL
--      itself reports the transaction as read-only.
-- Only SELECT, SET (session settings) and \echo. No temp tables, no functions,
-- no COPY, no writes. Every statement is limited by statement_timeout.
--
-- Personal data is masked in the database before it leaves: no display names;
-- e-mail as first letter + *** of local part and domain (a***@s***);
-- member_ref is a short hash of the user id, stable between runs.
-- Running it against production needs the owner's separate approval.

\set ON_ERROR_STOP on
\pset footer off
SET statement_timeout = '30s';
SET lock_timeout = '2s';
SET idle_in_transaction_session_timeout = '60s';
SET application_name = 'maos-access-impact-report';

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

\echo '== 0. Preflight: the run stops here unless the transaction is read-only'
SELECT current_setting('transaction_read_only') AS transaction_read_only,
       current_setting('default_transaction_read_only') AS session_default_read_only,
       current_setting('statement_timeout') AS statement_timeout,
       r.rolsuper AS role_is_superuser,
       r.rolcreaterole AS role_can_create_roles,
       r.rolcreatedb AS role_can_create_databases
FROM pg_roles r
WHERE r.rolname = current_user;
SELECT 1 / (current_setting('transaction_read_only') = 'on')::int AS read_only_confirmed;

\echo '== 1. Managers: lose invoice/payment access and approval decisions unless granted'
SELECT t.name AS company,
       substr(md5(u.id), 1, 8) AS member_ref,
       left(split_part(u.email, '@', 1), 1) || '***@' || left(split_part(u.email, '@', 2), 1) || '***' AS member_masked,
       (SELECT count(*) FROM "ApprovalDecision" d
         WHERE d."tenantId" = m."tenantId" AND d."decidedByUserId" = m."userId") AS past_decisions
FROM "TenantMembership" m
JOIN "Tenant" t ON t.id = m."tenantId"
JOIN "User" u ON u.id = m."userId"
WHERE m.role = 'MANAGER' AND m.status = 'ACTIVE'
ORDER BY t.name, member_ref;

\echo '== 2. Employees: tasks visible today vs after (assigned + member projects)'
SELECT t.name AS company,
       substr(md5(u.id), 1, 8) AS member_ref,
       left(split_part(u.email, '@', 1), 1) || '***@' || left(split_part(u.email, '@', 2), 1) || '***' AS member_masked,
       (SELECT count(*) FROM "Task" k WHERE k."tenantId" = m."tenantId") AS tasks_today,
       (SELECT count(*) FROM "Task" k WHERE k."tenantId" = m."tenantId"
          AND (k."assignedToUserId" = m."userId"
               OR k."projectId" IN (SELECT pm."projectId" FROM "ProjectMember" pm
                                    WHERE pm."tenantId" = m."tenantId" AND pm."userId" = m."userId"))) AS tasks_after
FROM "TenantMembership" m
JOIN "Tenant" t ON t.id = m."tenantId"
JOIN "User" u ON u.id = m."userId"
WHERE m.role = 'EMPLOYEE' AND m.status = 'ACTIVE'
ORDER BY t.name, member_ref;

\echo '== 3. Contractors: chat channels visible today vs after (membership or own project)'
SELECT t.name AS company,
       substr(md5(u.id), 1, 8) AS member_ref,
       left(split_part(u.email, '@', 1), 1) || '***@' || left(split_part(u.email, '@', 2), 1) || '***' AS member_masked,
       (SELECT count(*) FROM "ChatChannel" c WHERE c."tenantId" = m."tenantId") AS channels_today,
       (SELECT count(*) FROM "ChatChannel" c WHERE c."tenantId" = m."tenantId"
          AND (EXISTS (SELECT 1 FROM "ChatMembership" cm WHERE cm."channelId" = c.id AND cm."userId" = m."userId")
               OR (c."resourceType" = 'project' AND c."resourceId" IN (
                    SELECT pm."projectId" FROM "ProjectMember" pm WHERE pm."tenantId" = m."tenantId" AND pm."userId" = m."userId"
                    UNION SELECT k."projectId" FROM "Task" k WHERE k."tenantId" = m."tenantId" AND k."assignedToUserId" = m."userId"
                      AND k."projectId" IS NOT NULL)))) AS channels_after
FROM "TenantMembership" m
JOIN "Tenant" t ON t.id = m."tenantId"
JOIN "User" u ON u.id = m."userId"
WHERE m.role = 'CONTRACTOR' AND m.status = 'ACTIVE'
ORDER BY t.name, member_ref;

\echo '== 4. Approvals waiting today (decided after deploy only by owners and approvers)'
SELECT t.name AS company, count(*) AS waiting
FROM "ApprovalRequest" a
JOIN "Tenant" t ON t.id = a."tenantId"
WHERE a.status = 'REQUESTED'
GROUP BY t.name
ORDER BY t.name;

\echo '== 5. Explicit grant rows already present (expected: none before PR #124)'
SELECT t.name AS company, m.role, p.action, p.resource, p.granted, count(*) AS rows
FROM "MembershipPermission" p
JOIN "TenantMembership" m ON m.id = p."membershipId"
JOIN "Tenant" t ON t.id = m."tenantId"
WHERE p.action IN ('grant', 'decide', 'read-all') OR p.resource IN ('invoice', 'payment')
GROUP BY t.name, m.role, p.action, p.resource, p.granted
ORDER BY t.name, m.role;

ROLLBACK;
