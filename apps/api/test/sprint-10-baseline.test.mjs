import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

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
    const controllers = [
      readApi('src/modules/dashboards/dashboards.controller.ts'),
      readApi('src/modules/reports/reports.controller.ts'),
    ].join('\n');
    const permissionTypes = readApi('src/modules/permissions/permission.types.ts');
    const permissionService = readApi('src/modules/permissions/permission.service.ts');

    assert.match(controllers, /@UseGuards\(PermissionGuard\)/);
    assert.match(controllers, /RequirePermission/);
    assert.match(permissionTypes, /DASHBOARD/);
    assert.match(permissionTypes, /DASHBOARD_WIDGET/);
    assert.match(permissionTypes, /REPORT/);
    assert.match(permissionTypes, /REPORT_RUN/);
    assert.match(permissionService, /isManagerSafeDashboardReportAccess/);
    assert.match(permissionService, /manager_safe_dashboard_report_placeholder/);
  });

  it('keeps dashboard and report repositories tenant-aware without direct unscoped access', () => {
    const repositories = [
      readApi('src/modules/dashboards/dashboards.repository.ts'),
      readApi('src/modules/reports/reports.repository.ts'),
    ].join('\n');

    assert.match(repositories, /extends TenantAwareRepository/);
    assert.match(repositories, /requireTenantContext/);
    assert.doesNotMatch(repositories, /prisma\./);
  });

  it('suppresses hidden counts and protects owner-only finance summary data', () => {
    const dashboardService = readApi('src/modules/dashboards/dashboards.service.ts');
    const dashboardRepository = readApi('src/modules/dashboards/dashboards.repository.ts');
    const reportsService = readApi('src/modules/reports/reports.service.ts');

    assert.match(dashboardService, /MembershipRole\.OWNER/);
    assert.match(dashboardService, /Owner-only finance/);
    assert.match(dashboardRepository, /financeOwnerOnly/);
    assert.match(dashboardRepository, /hiddenCountTotalSuppression: true/);
    assert.match(reportsService, /applyHiddenCountTotalSuppression/);
    assert.match(reportsService, /report\.hidden_total\.suppressed/);
  });

  it('keeps client dashboard summaries client-safe', () => {
    const dashboardRepository = readApi('src/modules/dashboards/dashboards.repository.ts');
    const clientSummaryBlock =
      dashboardRepository.match(/getClientSummary[\s\S]*?sourceType: 'sprint-10-client-safe-placeholder'[\s\S]*?\};/)?.[0] ??
      '';

    assert.match(clientSummaryBlock, /projects/);
    assert.match(clientSummaryBlock, /tasks/);
    assert.match(clientSummaryBlock, /invoices/);
    assert.doesNotMatch(clientSummaryBlock, /costs/i);
    assert.doesNotMatch(clientSummaryBlock, /payroll/i);
    assert.doesNotMatch(clientSummaryBlock, /employee/i);
  });

  it('adds dashboard/report audit placeholders and keeps advanced BI deferred', () => {
    const services = [
      readApi('src/modules/dashboards/dashboards.service.ts'),
      readApi('src/modules/reports/reports.service.ts'),
    ].join('\n');
    const appModule = readApi('src/app.module.ts');

    assert.match(services, /dashboard\.viewed/);
    assert.match(services, /client_dashboard\.viewed/);
    assert.match(services, /report\.created/);
    assert.match(services, /report\.run/);
    assert.match(services, /report\.access\.denied/);
    assert.match(services, /report\.hidden_total\.suppressed/);
    assert.doesNotMatch(appModule, /AdvancedBiModule/);
    assert.doesNotMatch(appModule, /ForecastingModule/);
    assert.doesNotMatch(appModule, /AnomalyDetectionModule/);
    assert.doesNotMatch(appModule, /AutomationsModule/);
  });
});
