import { expect, test } from '@playwright/test';
import { readSeed } from './support/seed';
import { signIn } from './support/ui';

const s = readSeed();

test('an unauthenticated visitor is sent to the sign-in page from both shells', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await page.goto('/client');
  await expect(page).toHaveURL(/\/auth\/login/);
  await page.goto('/finance');
  await expect(page).toHaveURL(/\/auth\/login/);
});

test('a wrong password is refused and the visitor stays on the sign-in page', async ({ page }) => {
  await signIn(page, { ...s.owner, password: `${s.owner.password}-wrong` });
  // Next.js also renders a route announcer with role=alert, so pick the banner by its text.
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid email or password.' })).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/login/);
});
