import { expect, test } from '@playwright/test';
import { call } from './support/api';
import { fileFor, readSeed } from './support/seed';
import { PNG, offers, signIn, useSession, workspaceNavHrefs } from './support/ui';

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

  test('creates a project from the projects page and finds it in the API', async ({ page }, info) => {
    const name = `E2E ${info.project.name} project created in the browser ${s.run}`;
    await useSession(page, s.sessions.owner, '/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    await expect(page.getByText(s.project.name)).toBeVisible();
    await expect(page.getByText(s.internalProject.name)).toBeVisible();
    await page.getByRole('button', { name: '+ New Project' }).click();
    await page.getByPlaceholder('Project name').fill(name);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText(name)).toBeVisible();
    const projects = await call<{ name: string }[]>('/projects', { token: s.sessions.owner.tokens.accessToken });
    expect(projects.body.map((p) => p.name)).toContain(name);
  });

  test('works the project board: lists, a new list and a new card, all stored', async ({ page }, info) => {
    await useSession(page, s.sessions.owner, `/projects/${s.project.id}`);
    await expect(page.getByRole('heading', { name: s.project.name })).toBeVisible();
    await page.goto(`/projects/${s.project.id}/board`);
    const board = page.getByRole('region', { name: 'Board lists' });
    await expect(board).toBeVisible();
    expect(await board.locator('section[aria-label]').count()).toBeGreaterThan(1); // the initialised lists plus "Not in a list"
    await expect(board.getByText(s.sharedTask.title)).toBeVisible();

    const listName = `${info.project.name === 'mobile' ? 'Mobile' : 'Desktop'} review ${s.run}`;
    await page.getByLabel('Add a list').fill(listName);
    await page.getByRole('button', { name: 'Add list', exact: true }).click();
    const list = board.locator(`section[aria-label="${listName}"]`);
    await expect(list).toBeVisible();

    const cardTitle = `Card added in the browser ${info.project.name} ${s.run}`;
    await list.getByRole('button', { name: '+ Add a card' }).click();
    await page.getByLabel(`New card in ${listName}`).fill(cardTitle);
    await list.getByRole('button', { name: 'Add card', exact: true }).click();
    await expect(list.getByText(cardTitle)).toBeVisible();

    const lists = await call<{ id: string; name: string }[]>(`/projects/${s.project.id}/lists`, { token: s.sessions.owner.tokens.accessToken });
    const stored = lists.body.find((l) => l.name === listName);
    expect(stored, 'the new list is stored').toBeTruthy();
    const tasks = await call<{ title: string; listId: string | null }[]>('/tasks', { token: s.sessions.owner.tokens.accessToken });
    expect(tasks.body.find((t) => t.title === cardTitle)?.listId).toBe(stored?.id);
  });

  test('creates a task on the task board and sees every task', async ({ page }, info) => {
    const title = `E2E ${info.project.name} task created in the browser ${s.run}`;
    await useSession(page, s.sessions.owner, '/tasks');
    await expect(page.getByRole('heading', { name: 'Task Board' })).toBeVisible();
    await expect(page.getByText(s.sharedTask.title)).toBeVisible();
    await expect(page.getByText(s.assignedTask.title)).toBeVisible();
    await page.getByRole('button', { name: 'New Task' }).click();
    await page.getByPlaceholder('What needs to be done?').fill(title);
    // Submit through the form: the modal unmounts its button on success, which makes a click race its own retry.
    await expect(page.getByRole('button', { name: 'Create Task' })).toBeEnabled();
    await page.getByPlaceholder('What needs to be done?').press('Enter');
    await expect(page.getByText(title)).toBeVisible();
    const tasks = await call<{ title: string }[]>('/tasks', { token: s.sessions.owner.tokens.accessToken });
    expect(tasks.body.map((t) => t.title)).toContain(title);
  });

  test('uploads a new version of the delivered file and sees the delivery in review', async ({ page }, info) => {
    const file = fileFor(s, info.project.name);
    await useSession(page, s.sessions.owner, '/files');
    await expect(page.getByRole('heading', { name: 'Files' })).toBeVisible();
    await page.getByRole('link', { name: new RegExp(file.name) }).click();
    await expect(page.getByRole('heading', { name: file.name })).toBeVisible();
    await expect(page.getByText(/with the client for review/)).toBeVisible();
    await page.getByLabel('Choose a file to upload').setInputFiles({ name: file.name, mimeType: 'image/png', buffer: PNG });
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    await expect(page.getByText('Uploaded as version 2.')).toBeVisible();
    await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
    const versions = await call<{ versionNumber: number }[]>(`/files/${file.id}/versions`, { token: s.sessions.owner.tokens.accessToken });
    expect(versions.body.map((v) => v.versionNumber).sort()).toEqual([1, 2]);
  });

  test('creates an invoice for the shared project and sees it with the existing one', async ({ page }, info) => {
    const number = `E2E-UI-${info.project.name.toUpperCase()}-${s.run.toUpperCase()}`;
    await useSession(page, s.sessions.owner, '/finance/invoices');
    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
    // The list renders a card layout and a table layout; one is hidden per viewport.
    await expect(page.getByRole('link', { name: s.invoice.number }).locator('visible=true').first()).toBeVisible();
    await page.getByRole('button', { name: '+ New Invoice' }).click();
    await page.getByPlaceholder('Invoice number').fill(number);
    await page.getByLabel('Project').selectOption({ label: s.project.name });
    await page.getByLabel('Line 1 description').fill('Browser-created line');
    await page.getByLabel('Line 1 quantity').fill('2');
    await page.getByLabel('Line 1 unit amount').fill('100');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('link', { name: number }).locator('visible=true').first()).toBeVisible();
    const invoices = await call<{ id: string; invoiceNumber: string }[]>('/invoices', { token: s.sessions.owner.tokens.accessToken });
    const stored = invoices.body.find((i) => i.invoiceNumber === number);
    expect(stored, 'the invoice is stored').toBeTruthy();
    const detail = await call<{ clientScopeKey: string | null; projectId: string | null }>(`/invoices/${stored?.id}`, { token: s.sessions.owner.tokens.accessToken });
    expect(detail.body.projectId).toBe(s.project.id);
    expect(detail.body.clientScopeKey, 'inherits the project customer').toBe(s.customerOne.clientScopeKey ?? `e2e-one-${s.run}`);
  });

  test('sees the team members', async ({ page }) => {
    await useSession(page, s.sessions.owner, '/team');
    await expect(page).toHaveURL(/\/team/);
    await expect(page.getByText(s.employee.fullName).first()).toBeVisible();
    await expect(page.getByText(s.manager.fullName).first()).toBeVisible();
  });
});
