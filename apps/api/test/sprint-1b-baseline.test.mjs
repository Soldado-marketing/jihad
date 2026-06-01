import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(apiRoot));
const readApi = (relativePath) => readFileSync(join(apiRoot, relativePath), 'utf8');
const readRepo = (relativePath) => readFileSync(join(repoRoot, relativePath), 'utf8');

describe('Sprint 1B permissions and audit foundation baseline', () => {
  it('adds the Sprint 1B audit event data model with required audit fields', () => {
    const schema = readApi('prisma/schema.prisma');
    const auditBlock = schema.match(/model AuditEvent \{([\s\S]*?)\n\}/)?.[1] ?? '';
    const fields = [
      'actorId',
      'tenantId',
      'resourceType',
      'resourceId',
      'action',
      'permissionResult',
      'outcome',
      'sessionId',
      'deviceId',
      'createdAt',
    ];

    assert.match(schema, /model AuditEvent \{/);
    for (const field of fields) {
      assert.match(auditBlock, new RegExp(`\\b${field}\\b`));
    }
  });

  it('keeps the MVP role foundation to Owner, Manager, Employee, and Client', () => {
    const roles = readApi('src/common/identity/membership-role.ts');

    assert.match(roles, /OWNER/);
    assert.match(roles, /MANAGER/);
    assert.match(roles, /EMPLOYEE/);
    assert.match(roles, /CLIENT/);
  });

  it('implements a route-level permission guard with tenant context and deny-by-default behavior', () => {
    const guard = readApi('src/modules/permissions/permission.guard.ts');
    const service = readApi('src/modules/permissions/permission.service.ts');

    assert.match(guard, /CanActivate/);
    assert.match(guard, /x-tenant-id/);
    assert.match(guard, /x-actor-role/);
    assert.match(guard, /ForbiddenException/);
    assert.match(service, /permission_requirement_missing/);
    assert.match(service, /tenant_context_missing/);
    assert.match(service, /owner_baseline_allow/);
  });

  it('includes restricted placeholders for Manager, Employee, and Client scopes', () => {
    const permissionService = readApi('src/modules/permissions/permission.service.ts');
    const scopeService = readApi('src/modules/permissions/resource-scope.service.ts');

    assert.match(permissionService, /manager_assigned_scope_placeholder/);
    assert.match(permissionService, /employee_own_assigned_scope_placeholder/);
    assert.match(permissionService, /client_own_client_visible_scope_placeholder/);
    assert.match(scopeService, /manager_assigned_scope_not_implemented/);
    assert.match(scopeService, /employee_own_assigned_scope_not_implemented/);
    assert.match(scopeService, /client_own_scope_not_implemented/);
  });

  it('adds audit service, append-only placeholder, correction event placeholder, and redaction helper', () => {
    const auditService = readApi('src/modules/audit/audit.service.ts');
    const redactor = readApi('src/modules/audit/audit-redactor.ts');

    assert.match(auditService, /createAuditEventPlaceholder/);
    assert.match(auditService, /append-only audit behavior/);
    assert.match(auditService, /createCorrectionEventPlaceholder/);
    assert.match(redactor, /REDACTED/);
    assert.match(redactor, /password/);
    assert.match(redactor, /payment/);
    assert.match(redactor, /ai.?prompt/i);
    assert.match(redactor, /file.?content/i);
    assert.match(redactor, /chat.?content/i);
    assert.match(redactor, /voice.?content/i);
    assert.match(redactor, /error.?stack/i);
  });

  it('documents permission drift review checklist', () => {
    const checklistPath = 'docs/sprint-1/permission-drift-review-checklist.md';
    const checklist = readRepo(checklistPath);

    assert.equal(existsSync(join(repoRoot, checklistPath)), true);
    assert.match(checklist, /Controllers do not access persistence directly/);
    assert.match(checklist, /Tenant-owned repositories reject missing tenant context/);
    assert.match(checklist, /No client portal, CRM, projects\/tasks, finance, AI, reports, or automations introduced/);
  });
});
