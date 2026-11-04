import { expect, test } from '@playwright/test';
import { call } from './support/api';
import { readSeed } from './support/seed';
import { useSession } from './support/ui';

const s = readSeed();

test.describe('Isolation between clients and between companies', () => {
  test('the second client of the same company sees none of the first client\'s work', async ({ page }) => {
    await useSession(page, s.sessions.clientTwo, '/client');
    await expect(page).toHaveURL(/\/client$/);
    for (const route of ['/client/projects', '/client/deliveries', '/client/invoices', '/client/appointments', '/client/requests']) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      await expect(page.getByText(s.project.name)).toHaveCount(0);
      for (const f of Object.values(s.files)) await expect(page.getByText(f.name)).toHaveCount(0);
      await expect(page.getByText(s.invoice.number)).toHaveCount(0);
      await expect(page.getByText(s.appointment.title)).toHaveCount(0);
      await expect(page.getByText(/New landing page/)).toHaveCount(0);
    }
    const token = s.sessions.clientTwo.tokens.accessToken;
    expect((await call(`/client/projects/${s.project.id}`, { token })).status).toBe(404);
    expect((await call(`/client/deliveries/${s.files.desktop.deliveryId}`, { token })).status).toBe(404);
    expect((await call(`/client/invoices/${s.invoice.id}`, { token })).status).toBe(404);
    expect((await call(`/client/invoices/${s.invoice.id}/pdf`, { token })).status).toBe(404);
    // The content route refuses another client's file outright (403, no bytes); the record routes answer 404.
    expect((await call(`/client/files/${s.files.desktop.id}/versions/${s.files.desktop.versionId}/content`, { token })).status).toBe(403);
    expect((await call(`/client/deliveries/${s.files.desktop.deliveryId}/decision`, { method: 'POST', token, body: { decision: 'APPROVE' } })).status).toBe(404);
  });

  test('the owner of another company sees only that company, in the browser and at the API', async ({ page }) => {
    await useSession(page, s.sessions.otherOwner, '/projects');
    await expect(page.getByText(s.other.projectName)).toBeVisible();
    await expect(page.getByText(s.project.name)).toHaveCount(0);
    await expect(page.getByText(s.internalProject.name)).toHaveCount(0);
    await page.goto(`/projects/${s.project.id}`);
    await expect(page.getByText(s.project.name)).toHaveCount(0);
    await expect(page.getByText(s.sharedTask.title)).toHaveCount(0);
    await page.goto('/tasks');
    await expect(page.getByText(s.sharedTask.title)).toHaveCount(0);
    await expect(page.getByText(s.assignedTask.title)).toHaveCount(0);
    await page.goto('/customers');
    await expect(page.getByText(s.customerOne.name)).toHaveCount(0);
    const token = s.sessions.otherOwner.tokens.accessToken;
    expect((await call(`/projects/${s.project.id}`, { token })).status).toBe(404);
    expect((await call(`/projects/${s.project.id}`, { method: 'PATCH', token, body: { name: 'hijacked' } })).status).toBe(404);
    expect((await call(`/tasks/${s.sharedTask.id}`, { token })).status).toBe(404);
    expect((await call(`/invoices/${s.invoice.id}`, { token })).status).toBe(404);
    expect((await call(`/files/${s.files.desktop.id}`, { token })).status).toBe(404);
    expect((await call(`/customers/${s.customerOne.id}`, { token })).status).toBe(404);
    const projects = await call<{ id: string }[]>('/projects', { token });
    expect(projects.body.map((p) => p.id)).toEqual([s.other.projectId]);
    const customers = await call<{ id: string }[]>('/customers', { token });
    expect(customers.body.map((c) => c.id)).not.toContain(s.customerOne.id);
  });

  test('the first company\'s owner sees nothing of the other company', async ({ page }) => {
    await useSession(page, s.sessions.owner, '/projects');
    await expect(page.getByText(s.project.name)).toBeVisible();
    await expect(page.getByText(s.other.projectName)).toHaveCount(0);
    const token = s.sessions.owner.tokens.accessToken;
    expect((await call(`/projects/${s.other.projectId}`, { token })).status).toBe(404);
    expect((await call(`/projects/${s.other.projectId}`, { method: 'PATCH', token, body: { name: 'hijacked' } })).status).toBe(404);
  });
});
