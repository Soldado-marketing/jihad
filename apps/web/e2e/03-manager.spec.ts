import { expect, test } from '@playwright/test';
import { call } from './support/api';
import { readSeed } from './support/seed';
import { offers, useSession, workspaceNavHrefs } from './support/ui';

const s = readSeed();

test.describe('MANAGER', () => {
  test('runs projects, tasks, customers and CRM but never the owner-only finance, team and audit', async ({ page }) => {
    await useSession(page, s.sessions.manager);
    await expect(page).toHaveURL(/\/dashboard/);
    const nav = await workspaceNavHrefs(page);
    for (const section of ['/projects', '/tasks', '/files', '/customers', '/crm', '/reports']) {
      expect(offers(nav, section), `manager navigation offers ${section}`).toBe(true);
    }
    for (const section of ['/finance', '/team', '/audit', '/control-center']) {
      expect(offers(nav, section), `manager navigation must not offer ${section}`).toBe(false);
    }
    await page.goto('/projects');
    await expect(page.getByText(s.project.name)).toBeVisible();
    await page.goto('/crm');
    await expect(page.getByRole('heading', { name: 'CRM' })).toBeVisible();
    await page.goto('/customers');
    await expect(page.getByText(s.customerOne.name)).toBeVisible();
  });

  test('is refused finance data by the API even when typing the URL', async ({ page }) => {
    const token = s.sessions.manager.tokens.accessToken;
    expect((await call('/finance/summary', { token })).status).toBe(403);
    expect((await call('/invoices', { token })).status).toBe(403);
    await useSession(page, s.sessions.manager, '/finance');
    await expect(page.getByText(s.invoice.number)).toHaveCount(0);
    await expect(page.getByText(/1[.,]250/)).toHaveCount(0);
  });
});
