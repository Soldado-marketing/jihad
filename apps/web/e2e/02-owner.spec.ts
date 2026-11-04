import { expect, test } from '@playwright/test';
import { fileFor, readSeed } from './support/seed';
import { offers, signIn, useSession, workspaceNavHrefs } from './support/ui';

const s = readSeed();

test.describe('OWNER', () => {
  test('signs in, lands on the dashboard and gets the full navigation', async ({ page }) => {
    await signIn(page, s.owner); // the one real owner sign-in of this project
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(s.owner.fullName);
    const nav = await workspaceNavHrefs(page);
    for (const section of ['/projects', '/tasks', '/files', '/customers', '/crm', '/finance', '/team', '/audit', '/reports']) {
      expect(offers(nav, section), `owner navigation offers ${section}`).toBe(true);
    }
    const tenant = await page.evaluate(() => JSON.parse(localStorage.getItem('maos_tenant') ?? 'null'));
    expect(tenant?.slug).toBe(s.company.slug);
  });

  test('sees the company projects and the project board with its lists and task', async ({ page }) => {
    await useSession(page, s.sessions.owner, '/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    await expect(page.getByText(s.project.name)).toBeVisible();
    await expect(page.getByText(s.internalProject.name)).toBeVisible();
    await page.goto(`/projects/${s.project.id}`);
    await expect(page.getByRole('heading', { name: s.project.name })).toBeVisible();
    await page.goto(`/projects/${s.project.id}/board`);
    const board = page.getByRole('region', { name: 'Board lists' });
    await expect(board).toBeVisible();
    // The initialised board has named lists beyond "Not in a list".
    expect(await board.locator('section[aria-label]').count()).toBeGreaterThan(1);
    await expect(board.getByText(s.sharedTask.title)).toBeVisible();
  });

  test('works the task board, the file with its delivery in review, the invoices and the team', async ({ page }, info) => {
    const file = fileFor(s, info.project.name);
    await useSession(page, s.sessions.owner, '/tasks');
    await expect(page.getByRole('heading', { name: 'Task Board' })).toBeVisible();
    await expect(page.getByText(s.sharedTask.title)).toBeVisible();
    await expect(page.getByText(s.assignedTask.title)).toBeVisible();

    await page.goto('/files');
    await expect(page.getByRole('heading', { name: 'Files' })).toBeVisible();
    await page.getByRole('link', { name: new RegExp(file.name) }).click();
    await expect(page.getByRole('heading', { name: file.name })).toBeVisible();
    await expect(page.getByText(/with the client for review/)).toBeVisible();

    await page.goto('/finance/invoices');
    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
    // The invoice list renders a card layout and a table layout; one is hidden per viewport.
    await expect(page.getByRole('link', { name: s.invoice.number }).locator('visible=true').first()).toBeVisible();

    await page.goto('/team');
    await expect(page).toHaveURL(/\/team/);
    await expect(page.getByText(s.employee.fullName).first()).toBeVisible();
  });
});
