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

describe('Sprint 9 finance basic frontend baseline', () => {
  it('adds owner-only finance workspace pages and client invoice/payment pages', () => {
    const routes = [
      'app/(workspace)/finance/page.tsx',
      'app/(workspace)/finance/revenue/page.tsx',
      'app/(workspace)/finance/costs/page.tsx',
      'app/(workspace)/finance/invoices/page.tsx',
      'app/(workspace)/finance/invoices/[id]/page.tsx',
      'app/(workspace)/finance/payments/page.tsx',
      'app/(client)/client/invoices/page.tsx',
      'app/(client)/client/invoices/[id]/page.tsx',
      'app/(client)/client/payments/page.tsx',
    ];

    for (const route of routes) {
      assert.equal(existsWeb(route), true, `${route} should exist`);
    }
  });

  it('adds required finance components', () => {
    const components = [
      'src/components/finance/finance-overview.tsx',
      'src/components/finance/revenue-list.tsx',
      'src/components/finance/cost-list.tsx',
      'src/components/finance/profitability-summary-card.tsx',
      'src/components/finance/invoice-list.tsx',
      'src/components/finance/invoice-detail.tsx',
      'src/components/finance/invoice-status-badge.tsx',
      'src/components/finance/payment-list.tsx',
      'src/components/finance/payment-status-badge.tsx',
      'src/components/finance/owner-only-finance-notice.tsx',
      'src/components/finance/client-invoice-list.tsx',
      'src/components/finance/client-invoice-detail.tsx',
      'src/components/finance/client-payment-list.tsx',
    ];

    for (const component of components) {
      assert.equal(existsWeb(component), true, `${component} should exist`);
    }
  });

  it('adds Finance navigation only for Owner and client invoice/payment navigation only for clients', () => {
    const workspaceNavigation = readWeb('src/navigation/navigation.ts');
    const clientNavigation = readWeb('src/navigation/client-navigation.ts');
    const financeNavigationBlock =
      workspaceNavigation.match(/id: 'finance'[\s\S]*?clientSafe: false,/)?.[0] ?? '';

    assert.match(workspaceNavigation, /id: 'finance'/);
    assert.match(workspaceNavigation, /href: '\/finance'/);
    assert.match(financeNavigationBlock, /allowedRoles: \['OWNER'\]/);
    assert.doesNotMatch(financeNavigationBlock, /MANAGER/);
    assert.doesNotMatch(financeNavigationBlock, /EMPLOYEE/);
    assert.doesNotMatch(financeNavigationBlock, /CLIENT/);
    assert.match(clientNavigation, /id: 'client-invoices'/);
    assert.match(clientNavigation, /href: '\/client\/invoices'/);
    assert.match(clientNavigation, /id: 'client-payments'/);
    assert.match(clientNavigation, /href: '\/client\/payments'/);
  });

  it('keeps client invoice and payment views client-safe', () => {
    const clientFiles = listFiles('app/(client)/client/invoices')
      .concat(listFiles('app/(client)/client/payments'))
      .map((file) => readWeb(file))
      .join('\n');

    assert.match(clientFiles, /ClientSafeNotice/);
    assert.doesNotMatch(clientFiles, /OwnerOnlyFinanceNotice/);
    assert.doesNotMatch(clientFiles, /CostList/);
    assert.doesNotMatch(clientFiles, /ProfitabilitySummaryCard/);
    assert.doesNotMatch(clientFiles, /payroll/i);
    assert.doesNotMatch(clientFiles, /audit/i);
    assert.doesNotMatch(clientFiles, /employee cost/i);
  });

  it('keeps deferred non-Sprint-9 features absent from new finance source', () => {
    const sprint9Files = listFiles('app/(workspace)/finance')
      .concat(listFiles('app/(client)/client/invoices'))
      .concat(listFiles('app/(client)/client/payments'))
      .concat(listFiles('src/components/finance'))
      .map((file) => readWeb(file))
      .join('\n');

    assert.doesNotMatch(sprint9Files, /payroll automation/i);
    assert.doesNotMatch(sprint9Files, /wallet/i);
    assert.doesNotMatch(sprint9Files, /payment provider integration/i);
    assert.doesNotMatch(sprint9Files, /tax automation/i);
    assert.doesNotMatch(sprint9Files, /advanced analytics/i);
    assert.doesNotMatch(sprint9Files, /report builder/i);
    assert.doesNotMatch(sprint9Files, /automation builder/i);
  });
});
