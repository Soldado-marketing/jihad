-- MAOS access grants (PR #124): who changes access when the PR is deployed.
-- READ-ONLY. Run with scripts/db-readonly-check.sh, which forces
-- default_transaction_read_only=on. Running it against production needs the
-- owner's separate approval; it prints names and e-mail addresses of members.
-- No amounts, no invoice numbers, no message text are read.

\echo '== 1. Managers: lose invoice/payment access and approval decisions unless granted'
SELECT t.name AS company, u."displayName" AS member, u.email,
       (SELECT count(*) FROM "ApprovalDecision" d WHERE d."tenantId" = m."tenantId" AND d."decidedByUserId" = m."userId") AS past_decisions
FROM "TenantMembership" m
JOIN "Tenant" t ON t.id = m."tenantId"
JOIN "User" u ON u.id = m."userId"
WHERE m.role = 'MANAGER' AND m.status = 'ACTIVE'
ORDER BY t.name, u.email;

\echo '== 2. Employees: tasks visible today vs after (assigned + member projects)'
SELECT t.name AS company, u."displayName" AS member, u.email,
       (SELECT count(*) FROM "Task" k WHERE k."tenantId" = m."tenantId") AS tasks_today,
       (SELECT count(*) FROM "Task" k WHERE k."tenantId" = m."tenantId"
          AND (k."assignedToUserId" = m."userId"
               OR k."projectId" IN (SELECT pm."projectId" FROM "ProjectMember" pm
                                    WHERE pm."tenantId" = m."tenantId" AND pm."userId" = m."userId"))) AS tasks_after
FROM "TenantMembership" m
JOIN "Tenant" t ON t.id = m."tenantId"
JOIN "User" u ON u.id = m."userId"
WHERE m.role = 'EMPLOYEE' AND m.status = 'ACTIVE'
ORDER BY t.name, u.email;

\echo '== 3. Contractors: chat channels visible today vs after (membership or own project)'
SELECT t.name AS company, u."displayName" AS member, u.email,
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
ORDER BY t.name, u.email;

\echo '== 4. Approvals waiting today (decided after deploy only by owners and approvers)'
SELECT t.name AS company, count(*) AS waiting
FROM "ApprovalRequest" a JOIN "Tenant" t ON t.id = a."tenantId"
WHERE a.status = 'REQUESTED'
GROUP BY t.name ORDER BY t.name;

\echo '== 5. Explicit grants already present (expected: none before PR #124)'
SELECT t.name AS company, m.role, p.action, p.resource, p.granted, count(*) AS rows
FROM "MembershipPermission" p
JOIN "TenantMembership" m ON m.id = p."membershipId"
JOIN "Tenant" t ON t.id = m."tenantId"
WHERE p.action IN ('grant', 'decide', 'read-all') OR p.resource IN ('invoice', 'payment')
GROUP BY t.name, m.role, p.action, p.resource, p.granted
ORDER BY t.name, m.role;
