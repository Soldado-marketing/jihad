import { expect, test, type Page } from '@playwright/test';
import { seed, type Person, type Seed } from './fixtures';

/**
 * A09 browser smoke: the paths an OWNER and a CLIENT take on a fresh install,
 * and the boundaries between them, in a real browser against the real API.
 * Serial on purpose: the company is created once and every test builds on it.
 */
test.describe.configure({ mode: 'serial' });

let s: Seed;
test.beforeAll(async () => { s = await seed(); });

async function signIn(page: Page, p: Person) {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(p.email);
  await page.getByLabel(/password|magic code/i).fill(p.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('an unauthenticated visitor is sent to the sign-in page', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await page.goto('/client');
  await expect(page).toHaveURL(/\/auth\/login/);
});

test('a wrong password is refused and stays on the sign-in page', async ({ page }) => {
  await signIn(page, { ...s.owner, password: `${s.owner.password}-wrong` });
  // Next.js also renders a route announcer with role=alert, so pick the banner by its text.
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid email or password.' })).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/login/);
});

test('the OWNER signs in and reaches the dashboard, projects and files', async ({ page }) => {
  await signIn(page, s.owner);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(s.owner.fullName);
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await page.goto('/files');
  await expect(page.getByRole('heading', { name: 'Files' })).toBeVisible();
  // The stored session is the owner's and names the company that was created.
  const tenant = await page.evaluate(() => JSON.parse(localStorage.getItem('maos_tenant') ?? 'null'));
  if (s.tenantSlug) expect(tenant?.slug).toBe(s.tenantSlug);
});

test('the CLIENT signs in to the portal only and never reaches the internal workspace', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, s.client);
  await expect(page).toHaveURL(/\/client$/);
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  // No internal navigation is offered to a client.
  await expect(page.locator('a[href^="/finance"], a[href^="/crm"], a[href^="/audit"], a[href^="/team"], a[href^="/dashboard"]')).toHaveCount(0);
  // Typing an internal URL brings the client back to the portal.
  for (const internal of ['/dashboard', '/projects', '/finance']) {
    await page.goto(internal);
    await expect(page).toHaveURL(/\/client/);
  }
  await context.close();
});
