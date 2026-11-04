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

  test('is kept out of the client portal, in the browser and at the API', async ({ page }) => {
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
    // The internal routes keep the employee to assigned work.
    const tasks = await call<{ id: string }[]>('/tasks', { token });
    expect(tasks.status).toBe(200);
    expect(tasks.body.map((t) => t.id)).toEqual([s.assignedTask.id]);
  });
});
