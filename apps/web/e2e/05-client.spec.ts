import { expect, test } from '@playwright/test';
import { call } from './support/api';
import { fileFor, readSeed } from './support/seed';
import { signIn, useSession } from './support/ui';

const s = readSeed();
const INTERNAL = 'a[href^="/finance"], a[href^="/crm"], a[href^="/audit"], a[href^="/team"], a[href^="/dashboard"], a[href^="/projects"], a[href^="/tasks"], a[href^="/files"]';

test.describe('CLIENT', () => {
  test('signs in to the portal, sees only its own project, and is sent back from internal URLs', async ({ page }) => {
    await signIn(page, s.clientOne); // the one real client sign-in of this project
    await expect(page).toHaveURL(/\/client$/);
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
    await expect(page.locator(INTERNAL)).toHaveCount(0);
    await page.goto('/client/projects');
    await expect(page.getByText(s.project.name).first()).toBeVisible();
    await expect(page.getByText(s.internalProject.name)).toHaveCount(0);
    for (const internal of ['/dashboard', '/projects', '/finance', '/files']) {
      await page.goto(internal);
      await expect(page).toHaveURL(/\/client/);
    }
    const token = s.sessions.clientOne.tokens.accessToken;
    expect((await call('/projects', { token })).status).toBe(403);
    expect((await call('/tasks', { token })).status).toBe(403);
  });

  test('reviews the delivery, reads the invoice and the appointment', async ({ page }, info) => {
    const file = fileFor(s, info.project.name);
    await useSession(page, s.sessions.clientOne, '/client/deliveries');
    await expect(page.getByText(file.name).first()).toBeVisible();
    await page.getByRole('link', { name: new RegExp(file.name) }).first().click();
    await expect(page).toHaveURL(new RegExp(`/client/deliveries/${file.deliveryId}`));
    await page.getByRole('button', { name: 'Approve' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Thank you, the delivery is approved.')).toBeVisible();
    const deliveries = await call<{ id: string; status: string }[]>('/client/deliveries', { token: s.sessions.clientOne.tokens.accessToken });
    expect(deliveries.body.find((d) => d.id === file.deliveryId)?.status).toBe('APPROVED');

    await page.goto('/client/invoices');
    await expect(page.getByText(`Invoice ${s.invoice.number}`)).toBeVisible();
    await page.goto('/client/appointments');
    await expect(page.getByText(s.appointment.title)).toBeVisible();
    await expect(page.getByText(s.appointment.location)).toBeVisible();
    // No staff name reaches the client.
    await expect(page.getByText(s.owner.fullName)).toHaveCount(0);
    await expect(page.getByText(s.employee.fullName)).toHaveCount(0);
  });
});
