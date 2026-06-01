import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readApi = (relativePath) => readFileSync(join(apiRoot, relativePath), 'utf8');
const existsApi = (relativePath) => existsSync(join(apiRoot, relativePath));

describe('Sprint 6 files, file versioning, and approvals API baseline', () => {
  it('adds file, version, visibility, and approval data models with tenant scope', () => {
    const schema = readApi('prisma/schema.prisma');
    const models = [
      'FileAsset',
      'FileVersion',
      'FileShare',
      'ApprovalRequest',
      'ApprovalDecision',
    ];
    const enums = [
      'FileVisibility',
      'FileVersionStatus',
      'ApprovalStatus',
      'ApprovalDecisionType',
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

    assert.match(schema, /CLIENT_VISIBLE/);
    assert.match(schema, /CHANGES_REQUESTED/);
  });

  it('adds file, file version, and approval modules with REST-first endpoint skeletons', () => {
    const requiredFiles = [
      'src/modules/files/files.controller.ts',
      'src/modules/files/files.service.ts',
      'src/modules/files/files.repository.ts',
      'src/modules/files/signed-url.service.ts',
      'src/modules/files/files.module.ts',
      'src/modules/file-versions/file-versions.module.ts',
      'src/modules/approvals/approvals.controller.ts',
      'src/modules/approvals/approvals.service.ts',
      'src/modules/approvals/approvals.repository.ts',
      'src/modules/approvals/approvals.module.ts',
    ];

    for (const file of requiredFiles) {
      assert.equal(existsApi(file), true, `${file} should exist`);
    }

    const filesController = readApi('src/modules/files/files.controller.ts');
    const approvalsController = readApi('src/modules/approvals/approvals.controller.ts');

    assert.match(filesController, /@Controller\('files'\)/);
    assert.match(filesController, /@Get\(\)/);
    assert.match(filesController, /@Post\(\)/);
    assert.match(filesController, /@Get\(':id'\)/);
    assert.match(filesController, /@Patch\(':id'\)/);
    assert.match(filesController, /@Get\(':id\/versions'\)/);
    assert.match(filesController, /@Post\(':id\/versions'\)/);
    assert.match(filesController, /@Get\(':id\/signed-url'\)/);
    assert.match(approvalsController, /@Controller\('approvals'\)/);
    assert.match(approvalsController, /@Get\(\)/);
    assert.match(approvalsController, /@Post\(\)/);
    assert.match(approvalsController, /@Get\(':id'\)/);
    assert.match(approvalsController, /@Post\(':id\/decision'\)/);
  });

  it('uses permission guard and Sprint 6 permission resources on protected routes', () => {
    const controllers = [
      readApi('src/modules/files/files.controller.ts'),
      readApi('src/modules/approvals/approvals.controller.ts'),
    ].join('\n');
    const permissionTypes = readApi('src/modules/permissions/permission.types.ts');

    assert.match(controllers, /@UseGuards\(PermissionGuard\)/);
    assert.match(controllers, /RequirePermission/);
    assert.match(permissionTypes, /FILE/);
    assert.match(permissionTypes, /FILE_VERSION/);
    assert.match(permissionTypes, /APPROVAL/);
  });

  it('keeps file and approval repositories tenant-aware without direct unscoped access', () => {
    const repositories = [
      readApi('src/modules/files/files.repository.ts'),
      readApi('src/modules/approvals/approvals.repository.ts'),
    ].join('\n');

    assert.match(repositories, /extends TenantAwareRepository/);
    assert.match(repositories, /requireTenantContext/);
    assert.doesNotMatch(repositories, /prisma\./);
  });

  it('adds signed URL placeholder safeguards and audit placeholders', () => {
    const signedUrlService = readApi('src/modules/files/signed-url.service.ts');
    const filesService = readApi('src/modules/files/files.service.ts');
    const approvalsService = readApi('src/modules/approvals/approvals.service.ts');

    assert.match(signedUrlService, /validateActorScope/);
    assert.match(signedUrlService, /validateTenantOwnership/);
    assert.match(signedUrlService, /expiresInSeconds: 300/);
    assert.match(signedUrlService, /signedUrlPayload: 'redacted-placeholder'/);
    assert.match(signedUrlService, /file\.signed_url\.requested/);
    assert.match(filesService, /file\.created/);
    assert.match(filesService, /file\.updated/);
    assert.match(filesService, /file\.version\.created/);
    assert.match(approvalsService, /approval\.requested/);
    assert.match(approvalsService, /approval\.decision_recorded/);
  });

  it('preserves client-visible file boundary and approval-safe payloads', () => {
    const filesRepository = readApi('src/modules/files/files.repository.ts');
    const approvalsRepository = readApi('src/modules/approvals/approvals.repository.ts');
    const clientController = readApi('src/modules/client-portal/client-portal.controller.ts');

    assert.match(filesRepository, /clientVisible/);
    assert.match(filesRepository, /clientScopeKey/);
    assert.match(approvalsRepository, /clientVisible/);
    assert.match(approvalsRepository, /clientScopeKey/);
    assert.doesNotMatch(clientController, /files/i);
    assert.doesNotMatch(clientController, /approvals/i);
  });

  it('keeps post-Sprint-6 deferred modules absent from apps/api modules', () => {
    const appModule = readApi('src/app.module.ts');

    assert.match(appModule, /FilesModule/);
    assert.match(appModule, /FileVersionsModule/);
    assert.match(appModule, /ApprovalsModule/);
    assert.doesNotMatch(appModule, /AiModule/);
    assert.doesNotMatch(appModule, /AutomationsModule/);
  });
});
