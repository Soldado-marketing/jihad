import { expect, test } from '@playwright/test';
import { call } from './support/api';
import { readSeed } from './support/seed';
import { useSession } from './support/ui';

const s = readSeed();

test.describe('Isolation between clients and between companies', () => {
  test('the second client of the same company sees none of the first client\'s work', async ({ page }) => {
    await useSession(page, s.sessions.clientTwo, '/client');
    await expect(page).toHaveURL(/\/client$/);
    for (const route of ['/client/projects', '/client/deliveries', '/client/invoices', '/client/appointments']) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      await expect(page.getByText(s.project.name)).toHaveCount(0);
      await expect(page.getByText(s.files.desktop.name)).toHaveCount(0);
      await expect(page.getByText(s.files.mobile.name)).toHaveCount(0);
      await expect(page.getByText(s.invoice.number)).toHaveCount(0);
      await expect(page.getByText(s.appointment.title)).toHaveCount(0);
    }
    const token = s.sessions.clientTwo.tokens.accessToken;
    expect((await call(`/client/projects/${s.project.id}`, { token })).status).toBe(404);
    expect((await call(`/client/deliveries/${s.files.desktop.deliveryId}`, { token })).status).toBe(404);
  });

  test('the owner of another company sees only that company', async ({ page }) => {
    await useSession(page, s.sessions.otherOwner, '/projects');
    await expect(page.getByText(s.other.projectName)).toBeVisible();
    await expect(page.getByText(s.project.name)).toHaveCount(0);
    await expect(page.getByText(s.internalProject.name)).toHaveCount(0);
    await page.goto(`/projects/${s.project.id}`);
    await expect(page.getByText(s.project.name)).toHaveCount(0);
    await expect(page.getByText(s.sharedTask.title)).toHaveCount(0);
    const token = s.sessions.otherOwner.tokens.accessToken;
    expect((await call(`/projects/${s.project.id}`, { token })).status).toBe(404);
    expect((await call(`/tasks/${s.sharedTask.id}`, { token })).status).toBe(404);
    expect((await call(`/invoices/${s.invoice.id}`, { token })).status).toBe(404);
    expect((await call(`/files/${s.files.desktop.id}`, { token })).status).toBe(404);
    const projects = await call<{ id: string }[]>('/projects', { token });
    expect(projects.body.map((p) => p.id)).toEqual([s.other.projectId]);
  });

  test('the first company\'s owner sees nothing of the other company', async ({ page }) => {
    await useSession(page, s.sessions.owner, '/projects');
    await expect(page.getByText(s.project.name)).toBeVisible();
    await expect(page.getByText(s.other.projectName)).toHaveCount(0);
    const token = s.sessions.owner.tokens.accessToken;
    expect((await call(`/projects/${s.other.projectId}`, { token })).status).toBe(404);
  });
});
