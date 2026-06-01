import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readApi = (relativePath) => readFileSync(join(apiRoot, relativePath), 'utf8');
const existsApi = (relativePath) => existsSync(join(apiRoot, relativePath));

describe('Sprint 5 CRM basic and collaboration foundation API baseline', () => {
  it('adds CRM and collaboration placeholder data models with tenant scope', () => {
    const schema = readApi('prisma/schema.prisma');
    const models = [
      'Lead',
      'Opportunity',
      'Meeting',
      'FollowUp',
      'ProposalDraft',
      'InternalNote',
    ];
    const enums = [
      'CrmPipelineStatus',
      'MeetingStatus',
      'FollowUpStatus',
      'ProposalDraftStatus',
    ];

    for (const model of models) {
      assert.match(schema, new RegExp(`model ${model} \\{`));
      const block = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
      assert.match(block, /tenantId\s+String/);
      assert.match(block, /@@index\(\[tenantId/);
    }

    for (const prismaEnum of enums) {
      assert.match(schema, new RegExp(`enum ${prismaEnum} \\{`));
    }

    assert.match(schema, /LEAD\s+CONTACTED\s+MEETING\s+PROPOSAL\s+NEGOTIATION\s+WON\s+LOST/s);
  });

  it('adds CRM and collaboration modules with REST-first endpoint skeletons', () => {
    const requiredFiles = [
      'src/modules/crm/crm.module.ts',
      'src/modules/leads/leads.controller.ts',
      'src/modules/leads/leads.service.ts',
      'src/modules/leads/leads.repository.ts',
      'src/modules/opportunities/opportunities.controller.ts',
      'src/modules/opportunities/opportunities.service.ts',
      'src/modules/opportunities/opportunities.repository.ts',
      'src/modules/meetings/meetings.controller.ts',
      'src/modules/follow-ups/follow-ups.controller.ts',
      'src/modules/collaboration/collaboration.controller.ts',
      'src/modules/collaboration/collaboration.service.ts',
      'src/modules/collaboration/collaboration.repository.ts',
    ];

    for (const file of requiredFiles) {
      assert.equal(existsApi(file), true, `${file} should exist`);
    }

    const controllers = [
      readApi('src/modules/leads/leads.controller.ts'),
      readApi('src/modules/opportunities/opportunities.controller.ts'),
      readApi('src/modules/meetings/meetings.controller.ts'),
      readApi('src/modules/follow-ups/follow-ups.controller.ts'),
      readApi('src/modules/collaboration/collaboration.controller.ts'),
    ].join('\n');

    assert.match(controllers, /@Controller\('crm\/leads'\)/);
    assert.match(controllers, /@Controller\('crm\/opportunities'\)/);
    assert.match(controllers, /@Controller\('crm\/meetings'\)/);
    assert.match(controllers, /@Controller\('crm\/follow-ups'\)/);
    assert.match(controllers, /@Controller\('collaboration\/internal-notes'\)/);
    assert.match(controllers, /@Get\(\)/);
    assert.match(controllers, /@Post\(\)/);
    assert.match(controllers, /@Get\(':id'\)/);
    assert.match(controllers, /@Patch\(':id'\)/);
  });

  it('uses permission guard and Sprint 5 permission resources on protected routes', () => {
    const controllers = [
      readApi('src/modules/leads/leads.controller.ts'),
      readApi('src/modules/opportunities/opportunities.controller.ts'),
      readApi('src/modules/meetings/meetings.controller.ts'),
      readApi('src/modules/follow-ups/follow-ups.controller.ts'),
      readApi('src/modules/collaboration/collaboration.controller.ts'),
    ].join('\n');
    const permissionTypes = readApi('src/modules/permissions/permission.types.ts');

    assert.match(controllers, /@UseGuards\(PermissionGuard\)/);
    assert.match(controllers, /RequirePermission/);
    assert.match(permissionTypes, /LEAD/);
    assert.match(permissionTypes, /OPPORTUNITY/);
    assert.match(permissionTypes, /MEETING/);
    assert.match(permissionTypes, /FOLLOW_UP/);
    assert.match(permissionTypes, /INTERNAL_NOTE/);
  });

  it('keeps CRM and collaboration repositories tenant-aware without direct unscoped access', () => {
    const repositories = [
      readApi('src/modules/leads/leads.repository.ts'),
      readApi('src/modules/opportunities/opportunities.repository.ts'),
      readApi('src/modules/meetings/meetings.repository.ts'),
      readApi('src/modules/follow-ups/follow-ups.repository.ts'),
      readApi('src/modules/collaboration/collaboration.repository.ts'),
    ].join('\n');

    assert.match(repositories, /extends TenantAwareRepository/);
    assert.match(repositories, /requireTenantContext/);
    assert.doesNotMatch(repositories, /prisma\./);
  });

  it('adds audit placeholders for CRM and internal collaboration actions', () => {
    const services = [
      readApi('src/modules/leads/leads.service.ts'),
      readApi('src/modules/opportunities/opportunities.service.ts'),
      readApi('src/modules/meetings/meetings.service.ts'),
      readApi('src/modules/follow-ups/follow-ups.service.ts'),
      readApi('src/modules/collaboration/collaboration.service.ts'),
    ].join('\n');

    assert.match(services, /lead\.created/);
    assert.match(services, /lead\.updated/);
    assert.match(services, /opportunity\.created/);
    assert.match(services, /opportunity\.updated/);
    assert.match(services, /meeting\.created/);
    assert.match(services, /followup\.created/);
    assert.match(services, /internal_note\.created/);
    assert.match(services, /createAuditEventPlaceholder/);
  });

  it('keeps CRM out of client portal routes and collaboration internal-only', () => {
    const clientController = readApi('src/modules/client-portal/client-portal.controller.ts');
    const collaboration = [
      readApi('src/modules/collaboration/collaboration.controller.ts'),
      readApi('src/modules/collaboration/collaboration.repository.ts'),
    ].join('\n');

    assert.doesNotMatch(clientController, /crm/i);
    assert.doesNotMatch(clientController, /collaboration/i);
    assert.match(collaboration, /internal-notes/);
    assert.match(collaboration, /internal-only/);
  });

  it('keeps post-Sprint-5 deferred modules absent from apps/api modules', () => {
    const appModule = readApi('src/app.module.ts');

    assert.match(appModule, /CrmModule/);
    assert.match(appModule, /CollaborationModule/);
    assert.doesNotMatch(appModule, /AiModule/);
    assert.doesNotMatch(appModule, /AutomationsModule/);
  });
});
