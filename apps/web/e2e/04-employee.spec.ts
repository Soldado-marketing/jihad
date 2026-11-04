import { expect, test } from '@playwright/test';
import { call } from './support/api';
import { readSeed } from './support/seed';
import { offers, useSession, workspaceNavHrefs } from './support/ui';

const s = readSeed();

test.describe('EMPLOYEE', () => {
  test('sees only assigned work and none of the management sections', async ({ page }) => {
    await useSession(page, s.sessions.employee);
    await expect(page).toHaveURL(/\/dashboard/);
    const nav = await workspaceNavHrefs(page);
    for (const section of ['/my-work', '/tasks', '/files']) expect(offers(nav, section), `employee navigation offers ${section}`).toBe(true);
    for (const section of ['/finance', '/team', '/audit', '/crm', '/reports', '/control-center']) {
      expect(offers(nav, section), `employee navigation must not offer ${section}`).toBe(false);
    }
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Task Board' })).toBeVisible();
    await expect(page.getByText(s.assignedTask.title)).toBeVisible();
    await expect(page.getByText(s.sharedTask.title)).toHaveCount(0);
    await page.goto('/my-work');
    await expect(page.getByRole('heading', { name: 'My Work' })).toBeVisible();
  });

  test('moves the assigned task to In Progress from the board and the change is stored', async ({ page }, info) => {
    await useSession(page, s.sessions.employee, '/tasks');
    await page.getByText(s.assignedTask.title).first().click();
    await expect(page.getByPlaceholder('Task title')).toHaveValue(s.assignedTask.title);
    // The editor's selects carry no label; the first one is the status.
    const target = info.project.name === 'mobile' ? 'In Review' : 'In Progress';
    await page.locator('select:not([aria-label])').first().selectOption({ label: target });
    // The editor shows "Save changes" in its footer on wide screens and a compact "Save" on narrow ones.
    await page.getByRole('button', { name: /^Save( changes)?$/ }).locator('visible=true').first().click();
    // The editor stays open after saving; the board behind it moves the card to the new column.
    await expect(page.getByRole('button', { name: `${target} 1` })).toBeVisible();
    const task = await call<{ status: string }>(`/tasks/${s.assignedTask.id}`, { token: s.sessions.employee.tokens.accessToken });
    expect(task.body.status).toBe(target === 'In Review' ? 'IN_REVIEW' : 'IN_PROGRESS');
  });

  test('is kept out of the client portal and of management writes, in the browser and at the API', async ({ page }) => {
    await useSession(page, s.sessions.employee, '/client');
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto('/client/deliveries');
    await expect(page).toHaveURL(/\/dashboard/);
    const token = s.sessions.employee.tokens.accessToken;
    for (const route of ['/client/projects', '/client/tasks', '/client/deliveries', '/client/appointments', '/client/files', `/client/projects/${s.project.id}`]) {
      const r = await call(route, { token });
      expect(r.status, `${route} for an employee`).toBe(403);
      expect(JSON.stringify(r.body)).not.toContain(s.project.name);
    }
    expect((await call('/projects', { method: 'POST', token, body: { name: `forbidden ${s.run}` } })).status).toBe(403);
    expect((await call('/customers', { method: 'POST', token, body: { name: `forbidden ${s.run}`, clientScopeKey: `forbidden-${s.run}` } })).status).toBe(403);
    expect((await call('/finance/summary', { token })).status).toBe(403);
    expect((await call('/audit-events', { token })).status).toBe(403);
    expect((await call('/admin/invites', { method: 'POST', token, body: { email: `nobody-${s.run}@example.test`, role: 'EMPLOYEE' } })).status).toBe(403);
    // The internal routes keep the employee to assigned work.
    const tasks = await call<{ id: string }[]>('/tasks', { token });
    expect(tasks.status).toBe(200);
    expect(tasks.body.map((t) => t.id)).toEqual([s.assignedTask.id]);
  });
});
