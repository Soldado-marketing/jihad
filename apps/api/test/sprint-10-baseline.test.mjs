import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertGuardedController, assertTenantScopedRepository } from './support/source-assertions.mjs';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readApi = (relativePath) => readFileSync(join(apiRoot, relativePath), 'utf8');
const existsApi = (relativePath) => existsSync(join(apiRoot, relativePath));

describe('Sprint 10 dashboards and reports basic API baseline', () => {
  it('adds dashboard/report placeholder models with tenant scope', () => {
    const schema = readApi('prisma/schema.prisma');
    const models = ['ReportDefinition', 'ReportRun', 'DashboardWidget'];

    assert.match(schema, /enum ReportVisibility \{/);
    assert.match(schema, /INTERNAL/);
    assert.match(schema, /OWNER_ONLY/);
    assert.match(schema, /CLIENT_SAFE/);

    for (const model of models) {
      assert.match(schema, new RegExp(`model ${model} \\{`));
      const block = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
      assert.match(block, /tenantId\s+String/);
      assert.match(block, /@@index\(\[tenantId/);
    }
  });

  it('adds dashboard and report modules with REST-first endpoint skeletons', () => {
    const requiredFiles = [
      'src/modules/dashboards/dashboards.controller.ts',
      'src/modules/dashboards/dashboards.service.ts',
      'src/modules/dashboards/dashboards.repository.ts',
      'src/modules/dashboards/dashboards.module.ts',
      'src/modules/reports/reports.controller.ts',
      'src/modules/reports/reports.service.ts',
      'src/modules/reports/reports.repository.ts',
      'src/modules/reports/reports.module.ts',
      'src/modules/reports/dto/create-report-definition.dto.ts',
    ];

    for (const file of requiredFiles) {
      assert.equal(existsApi(file), true, `${file} should exist`);
    }

    const appModule = readApi('src/app.module.ts');
    assert.match(appModule, /DashboardsModule/);
    assert.match(appModule, /ReportsModule/);
  });

  it('adds the required dashboard and report endpoints', () => {
    const controllers = [
      readApi('src/modules/dashboards/dashboards.controller.ts'),
      readApi('src/modules/reports/reports.controller.ts'),
    ].join('\n');

    assert.match(controllers, /@Controller\('dashboards'\)/);
    assert.match(controllers, /@Get\('workspace-summary'\)/);
    assert.match(controllers, /@Get\('client-summary'\)/);
    assert.match(controllers, /@Controller\('reports'\)/);
    assert.match(controllers, /@Get\(\)/);
    assert.match(controllers, /@Post\(\)/);
    assert.match(controllers, /@Get\(':id'\)/);
    assert.match(controllers, /@Post\(':id\/run'\)/);
  });

  it('uses permission guards and safe Manager dashboard/report placeholders', () => {
    for (const path of [
      'src/modules/dashboards/dashboards.controller.ts',
      'src/modules/reports/reports.controller.ts',
    ]) {
      assertGuardedController(assert, readApi(path), path);
    }
    const permissionTypes = readApi('src/modules/permissions/permission.types.ts');
    const permissionService = readApi('src/modules/permissions/permission.service.ts');

    assert.match(permissionTypes, /DASHBOARD/);
    assert.match(permissionTypes, /DASHBOARD_WIDGET/);
    assert.match(permissionTypes, /REPORT/);
    assert.match(permissionTypes, /REPORT_RUN/);
    // MAOS-T39: MANAGER gets dashboards and reports through its default
    // grant set; finance is not in it (sensitive, owner-only).
    const managerSet = permissionService.match(/const MANAGER_WRITE_RESOURCES[\s\S]*?\]\);/)?.[0] ?? '';
    for (const r of ['DASHBOARD', 'DASHBOARD_WIDGET', 'REPORT', 'REPORT_RUN']) {
      assert.match(managerSet, new RegExp(`PermissionResource\\.${r},`));
    }
    assert.doesNotMatch(managerSet, /PermissionResource\.FINANCE\b/);
  });

  it('keeps dashboard and report repositories tenant-aware without direct unscoped access', () => {
    // MAOS-T39: every query carries a tenantId boundary. Reviewed exception:
    // the client-summary counts use a prebuilt `visible` filter with tenantId.
    const dashboardRepository = readApi('src/modules/dashboards/dashboards.repository.ts');
    assertTenantScopedRepository(assert, dashboardRepository, 'dashboards.repository.ts', ['project.count', 'task.count', 'invoice.count']);
    assert.match(dashboardRepository, /const visible = \{ tenantId, clientVisible: true, clientScopeKey \}/);
    assertTenantScopedRepository(assert, readApi('src/modules/reports/reports.repository.ts'), 'reports.repository.ts');
  });

  it('keeps finance amounts out of dashboards (finance summary is owner-only)', () => {
    // MAOS-T39: dashboards return counts only; money lives behind the
    // sensitive finance routes.
    const dashboardRepository = readApi('src/modules/dashboards/dashboards.repository.ts');
    const financeController = readApi('src/modules/finance/finance.controller.ts');
    assert.doesNotMatch(dashboardRepository, /totalCents|paidCents|amountCents|_sum/);
    assert.match(financeController, /@Get\('summary'\)\s*@RequirePermission\(\{[^}]*sensitive: true/);
  });

  it.todo('reports suppress hidden counts and totals (specified in Sprint 10, never built; backlog F-4)');

  it('keeps client dashboard summaries client-safe', () => {
    // MAOS-T39: the block is the real getClientSummary (MAOS-T26), whose counts
    // match the client's own portal lists.
    const dashboardRepository = readApi('src/modules/dashboards/dashboards.repository.ts');
    const clientSummaryBlock = dashboardRepository.match(/async getClientSummary[\s\S]*?\n  \}\n/)?.[0] ?? '';
    assert.notEqual(clientSummaryBlock, '');

    assert.match(clientSummaryBlock, /projects/);
    assert.match(clientSummaryBlock, /tasks/);
    assert.match(clientSummaryBlock, /invoices/);
    assert.match(clientSummaryBlock, /clientVisible: true/);
    assert.match(clientSummaryBlock, /status: \{ not: 'DRAFT' \}/);
    assert.doesNotMatch(clientSummaryBlock, /costs/i);
    assert.doesNotMatch(clientSummaryBlock, /payroll/i);
    assert.doesNotMatch(clientSummaryBlock, /employee/i);
  });

  it('keeps advanced BI deferred', () => {
    const appModule = readApi('src/app.module.ts');
    assert.doesNotMatch(appModule, /AdvancedBiModule/);
    assert.doesNotMatch(appModule, /ForecastingModule/);
    assert.doesNotMatch(appModule, /AnomalyDetectionModule/);
    assert.doesNotMatch(appModule, /AutomationsModule/);
  });

  it.todo('writes audit events for dashboard views and report runs (specified in Sprint 10, never built; backlog F-4)');
});
