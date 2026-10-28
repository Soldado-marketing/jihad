import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (relativePath) => readFileSync(join(apiRoot, relativePath), 'utf8');

describe('Sprint 1A identity foundation baseline', () => {
  it('defines only Sprint 1A identity data models in Prisma schema', () => {
    const schema = read('prisma/schema.prisma');
    const models = [
      'Tenant',
      'User',
      'TenantMembership',
      'Invite',
      'Session',
      'Device',
      'LoginHistory',
    ];

    for (const model of models) {
      assert.match(schema, new RegExp(`model ${model} \\{`));
    }
  });

  it('keeps tenant-owned models tenant-scoped', () => {
    const schema = read('prisma/schema.prisma');
    const tenantOwnedModels = [
      'TenantMembership',
      'Invite',
      'Session',
      'Device',
      'LoginHistory',
    ];

    for (const model of tenantOwnedModels) {
      const block = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
      assert.match(block, /tenantId\s+String\??/);
    }
  });

  it('keeps the former public registration endpoint disabled (invite-only policy)', () => {
    const authController = read('src/modules/auth/auth.controller.ts');
    assert.match(authController, /@Post\(['"`]register['"`]\)/);
    assert.match(authController, /Registration is invitation-only/);
    assert.doesNotMatch(authController, /this\.authService\.register\(/);
    const authService = read('src/modules/auth/auth.service.ts');
    assert.match(authService, /Keep this method as a fail-closed compatibility surface/);
  });

  it('creates the approved Sprint 1A module directories', () => {
    const modulesRoot = join(apiRoot, 'src/modules');
    const modules = new Set(readdirSync(modulesRoot));
    const expected = [
      'auth',
      'devices',
      'health',
      'login-history',
      'memberships',
      'prisma',
      'sessions',
      'tenant-context',
      'tenants',
      'users',
    ];

    for (const moduleName of expected) {
      assert.equal(modules.has(moduleName), true, `${moduleName} module should exist`);
    }
  });

  it('requires tenant context for tenant-aware repository access', () => {
    const repository = read('src/common/repositories/tenant-aware.repository.ts');

    assert.match(repository, /requireTenantContext/);
    assert.match(repository, /Tenant context is required/);
  });

  // The invite-acceptance placeholder was removed in MAOS-T38 (it answered with a
  // fake success); a real token-verified invite flow is a separate task.
  it('includes endpoint skeletons for health, sessions, and tenant context', () => {
    const expectedFiles = [
      'src/modules/health/health.controller.ts',
      'src/modules/sessions/sessions.controller.ts',
      'src/modules/tenant-context/tenant-context.controller.ts',
    ];

    for (const file of expectedFiles) {
      assert.equal(existsSync(join(apiRoot, file)), true, `${file} should exist`);
    }
  });
});
