import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertGuardedController, assertTenantScopedRepository } from './support/source-assertions.mjs';

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

    // MAOS-T39: the routes shipped without the crm/ prefix, and internal notes
    // live at collaboration/notes (the web app calls these paths).
    assert.match(controllers, /@Controller\('leads'\)/);
    assert.match(controllers, /@Controller\('opportunities'\)/);
    assert.match(controllers, /@Controller\('meetings'\)/);
    assert.match(controllers, /@Controller\('follow-ups'\)/);
    assert.match(controllers, /@Controller\('collaboration\/notes'\)/);
    assert.match(controllers, /@Get\(\)/);
    assert.match(controllers, /@Post\(\)/);
    assert.match(controllers, /@Get\(':id'\)/);
    assert.match(controllers, /@Patch\(':id'\)/);
  });

  it('uses permission guard and Sprint 5 permission resources on protected routes', () => {
    for (const path of [
      'src/modules/leads/leads.controller.ts',
      'src/modules/opportunities/opportunities.controller.ts',
      'src/modules/meetings/meetings.controller.ts',
      'src/modules/follow-ups/follow-ups.controller.ts',
      'src/modules/collaboration/collaboration.controller.ts',
    ]) {
      assertGuardedController(assert, readApi(path), path);
    }
    const permissionTypes = readApi('src/modules/permissions/permission.types.ts');

    assert.match(permissionTypes, /LEAD/);
    assert.match(permissionTypes, /OPPORTUNITY/);
    assert.match(permissionTypes, /MEETING/);
    assert.match(permissionTypes, /FOLLOW_UP/);
    assert.match(permissionTypes, /INTERNAL_NOTE/);
  });

  it('keeps CRM and collaboration repositories tenant-aware without direct unscoped access', () => {
    // MAOS-T39: every query carries a tenantId boundary (see support helper).
    for (const path of [
      'src/modules/leads/leads.repository.ts',
      'src/modules/opportunities/opportunities.repository.ts',
      'src/modules/meetings/meetings.repository.ts',
      'src/modules/follow-ups/follow-ups.repository.ts',
      'src/modules/collaboration/collaboration.repository.ts',
    ]) {
      assertTenantScopedRepository(assert, readApi(path), path);
    }
  });

  it.todo('writes audit events for CRM and internal collaboration actions (specified in Sprint 5, never built; backlog F-4)');

  it('keeps CRM out of client portal routes and collaboration internal-only', () => {
    const clientController = readApi('src/modules/client-portal/client-portal.controller.ts');
    const collaboration = [
      readApi('src/modules/collaboration/collaboration.controller.ts'),
      readApi('src/modules/collaboration/collaboration.repository.ts'),
    ].join('\n');

    assert.doesNotMatch(clientController, /crm/i);
    assert.doesNotMatch(clientController, /collaboration/i);
    // Internal notes are internal-only: no route is opened to the client portal.
    assert.match(collaboration, /PermissionResource\.INTERNAL_NOTE/);
    assert.doesNotMatch(collaboration, /client-portal/);
  });

  it('keeps post-Sprint-5 deferred modules absent from apps/api modules', () => {
    const appModule = readApi('src/app.module.ts');

    assert.match(appModule, /CrmModule/);
    assert.match(appModule, /CollaborationModule/);
    assert.doesNotMatch(appModule, /AiModule/);
    assert.doesNotMatch(appModule, /AutomationsModule/);
  });
});
