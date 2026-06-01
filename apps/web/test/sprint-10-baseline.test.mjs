import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const readWeb = (relativePath) => readFileSync(join(webRoot, relativePath), 'utf8');
const existsWeb = (relativePath) => existsSync(join(webRoot, relativePath));

function listFiles(relativePath) {
  const absolutePath = join(webRoot, relativePath);
  if (!existsSync(absolutePath)) {
    return [];
  }

  return readdirSync(absolutePath).flatMap((entry) => {
    const childPath = join(relativePath, entry);
    const fullPath = join(webRoot, childPath);

    if (statSync(fullPath).isDirectory()) {
      return listFiles(childPath);
    }

    return [childPath];
  });
}

describe('Sprint 10 dashboards and reports basic frontend baseline', () => {
  it('strengthens dashboard pages and adds report pages', () => {
    const routes = [
      'app/(workspace)/dashboard/page.tsx',
      'app/(workspace)/reports/page.tsx',
      'app/(workspace)/reports/[id]/page.tsx',
      'app/(client)/client/page.tsx',
    ];

    for (const route of routes) {
      assert.equal(existsWeb(route), true, `${route} should exist`);
    }
  });

  it('adds required dashboard and report components', () => {
    const components = [
      'src/components/dashboard/workspace-summary-grid.tsx',
      'src/components/dashboard/summary-card.tsx',
      'src/components/dashboard/project-task-summary.tsx',
      'src/components/dashboard/crm-summary.tsx',
      'src/components/dashboard/collaboration-summary.tsx',
      'src/components/dashboard/file-approval-summary.tsx',
      'src/components/dashboard/voice-summary.tsx',
      'src/components/dashboard/finance-summary-owner-only.tsx',
      'src/components/dashboard/client-dashboard-summary.tsx',
      'src/components/dashboard/hidden-data-notice.tsx',
      'src/components/reports/report-list.tsx',
      'src/components/reports/report-detail.tsx',
      'src/components/reports/report-run-panel.tsx',
    ];

    for (const component of components) {
      assert.equal(existsWeb(component), true, `${component} should exist`);
    }
  });

  it('adds Reports navigation for Owner and Manager only', () => {
    const workspaceNavigation = readWeb('src/navigation/navigation.ts');
    const reportsNavigationBlock =
      workspaceNavigation.match(/id: 'reports'[\s\S]*?clientSafe: false,/)?.[0] ?? '';
    const clientNavigation = readWeb('src/navigation/client-navigation.ts');

    assert.match(reportsNavigationBlock, /href: '\/reports'/);
    assert.match(reportsNavigationBlock, /allowedRoles: \['OWNER', 'MANAGER'\]/);
    assert.doesNotMatch(reportsNavigationBlock, /EMPLOYEE/);
    assert.doesNotMatch(reportsNavigationBlock, /CLIENT/);
    assert.doesNotMatch(clientNavigation, /reports/i);
  });

  it('keeps owner-only finance widget separate from client dashboard summaries', () => {
    const workspaceDashboard = readWeb('app/(workspace)/dashboard/page.tsx');
    const clientDashboard = readWeb('src/components/client-portal/client-dashboard.tsx');
    const clientSummary = readWeb('src/components/dashboard/client-dashboard-summary.tsx');

    assert.match(workspaceDashboard, /WorkspaceSummaryGrid/);
    assert.match(workspaceDashboard, /HiddenDataNotice/);
    assert.match(clientDashboard, /ClientDashboardSummary/);
    assert.doesNotMatch(clientSummary, /FinanceSummaryOwnerOnly/);
    assert.doesNotMatch(clientSummary, /CostList/);
    assert.doesNotMatch(clientSummary, /ProfitabilitySummaryCard/);
    assert.doesNotMatch(clientSummary, /payroll/i);
    assert.doesNotMatch(clientSummary, /employee cost/i);
  });

  it('includes hidden data notice and avoids advanced report features', () => {
    const sprint10Files = listFiles('app/(workspace)/reports')
      .concat(listFiles('src/components/reports'))
      .concat(listFiles('src/components/dashboard'))
      .map((file) => readWeb(file))
      .join('\n');

    assert.match(sprint10Files, /HiddenDataNotice/);
    assert.match(sprint10Files, /suppressed/);
    assert.doesNotMatch(sprint10Files, /forecast/i);
    assert.doesNotMatch(sprint10Files, /anomaly/i);
    assert.doesNotMatch(sprint10Files, /scheduled reports/i);
    assert.doesNotMatch(sprint10Files, /custom report builder/i);
    assert.doesNotMatch(sprint10Files, /AI reporting/i);
    assert.doesNotMatch(sprint10Files, /automation builder/i);
  });
});
