import { expect, test, type Page } from '@playwright/test';
import { readSeed } from './support/seed';
import { useSession } from './support/ui';

const s = readSeed();

/**
 * F04 - a failed load is shown as a failure, with another try, and never as
 * "nothing here", zero or "not found". Each test lets one API route answer 500
 * (the browser side of a server fault), checks what the person reads, then
 * lets the route through again and presses Try again.
 */
const SERVER = 'Something went wrong on our side. Please try again in a moment.';

/** One exact API path answers 500 until the returned function is called. */
async function failing(page: Page, pathname: string): Promise<() => Promise<void>> {
  const matches = (url: URL) => url.pathname === `/api${pathname}`;
  await page.route(matches, (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ statusCode: 500, message: 'Internal server error' }) }));
  return () => page.unroute(matches);
}

/** The shared error box with this title; Next's route announcer is another role=alert on every page. */
const failure = (page: Page, title: string) => page.getByRole('alert').filter({ hasText: title });

async function retry(page: Page, title: string) {
  await failure(page, title).getByRole('button', { name: 'Try again' }).click();
  await expect(failure(page, title)).toHaveCount(0);
}

test.describe('Failed loads are visible (workspace)', () => {
  test('revenue: a server fault is not "No revenue records yet."', async ({ page }) => {
    const restore = await failing(page, '/finance/revenue');
    await useSession(page, s.sessions.owner, '/finance/revenue');
    await expect(failure(page, 'Revenue records could not be loaded')).toContainText(SERVER);
    await expect(page.getByText('No revenue records yet.')).toHaveCount(0);
    await restore();
    await retry(page, 'Revenue records could not be loaded');
  });

  test('notifications: a server fault is not "No notifications."', async ({ page }) => {
    const restore = await failing(page, '/notifications');
    await useSession(page, s.sessions.owner, '/notifications');
    await expect(failure(page, 'Notifications could not be loaded')).toContainText(SERVER);
    await expect(page.getByText('No notifications.', { exact: true })).toHaveCount(0);
    await restore();
    await retry(page, 'Notifications could not be loaded');
  });

  test('CRM overview: a server fault is not four zeros', async ({ page }) => {
    const restore = await failing(page, '/leads');
    await useSession(page, s.sessions.owner, '/crm');
    await expect(failure(page, 'The CRM numbers could not be loaded')).toBeVisible();
    const leads = page.getByRole('link', { name: /Leads/ }).filter({ hasText: 'Leads' }).last();
    await expect(leads).toContainText('—');
    await restore();
    await retry(page, 'The CRM numbers could not be loaded');
    await expect(leads).toContainText(/\d/);
  });

  test('task detail: a server fault is not "Task not found."', async ({ page }) => {
    const restore = await failing(page, `/tasks/${s.sharedTask.id}`);
    await useSession(page, s.sessions.owner, `/tasks/${s.sharedTask.id}`);
    await expect(failure(page, 'This task could not be opened')).toContainText(SERVER);
    await expect(page.getByText('Task not found.')).toHaveCount(0);
    await restore();
    await retry(page, 'This task could not be opened');
    await expect(page.getByText(s.sharedTask.title).first()).toBeVisible();
  });

  test('a task that does not exist still reads as not found, with the reason from the server', async ({ page }) => {
    await useSession(page, s.sessions.owner, '/tasks/does-not-exist');
    await expect(failure(page, 'This task could not be opened')).toContainText(/not found/i);
  });
});

test.describe('Failed loads are visible (client portal)', () => {
  test('overview: failed invoices are not "All invoices are paid", and nothing claims "You are all set"', async ({ page }) => {
    const restore = await failing(page, '/client/invoices');
    await useSession(page, s.sessions.clientOne, '/client');
    await expect(failure(page, 'Part of your overview could not be loaded')).toBeVisible();
    const balance = page.getByRole('link', { name: /Open balance/ });
    await expect(balance).toContainText('could not be loaded');
    await expect(balance).toContainText('—');
    await expect(page.getByText('All invoices are paid')).toHaveCount(0);
    await expect(page.getByText('You are all set.')).toHaveCount(0);
    await restore();
    await retry(page, 'Part of your overview could not be loaded');
    await expect(balance).not.toContainText('could not be loaded');
  });

  test('notifications: a server fault is not "No notifications yet."', async ({ page }) => {
    const restore = await failing(page, '/notifications');
    await useSession(page, s.sessions.clientOne, '/client/notifications');
    await expect(failure(page, 'Your notifications could not be loaded')).toContainText(SERVER);
    await expect(page.getByText('No notifications yet.')).toHaveCount(0);
    await restore();
    await retry(page, 'Your notifications could not be loaded');
  });

  test('problem reports: a server fault is not "You have not reported anything yet."', async ({ page }) => {
    const restore = await failing(page, '/client/problems');
    await useSession(page, s.sessions.clientOne, '/client/problems');
    await expect(failure(page, 'Your list could not be loaded')).toContainText(SERVER);
    await expect(page.getByText('You have not reported anything yet.')).toHaveCount(0);
    await restore();
    await retry(page, 'Your list could not be loaded');
  });
});
