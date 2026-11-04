import { expect, type Page } from '@playwright/test';
import type { Person, Session } from './api';

export async function signIn(page: Page, p: Person) {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(p.email);
  await page.getByLabel(/password/i).fill(p.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/**
 * Start the browser as an already signed-in person: the four localStorage keys
 * the sign-in page writes (lib/auth.ts), then the landing page. One real
 * sign-in per shell is kept in auth.spec.ts; everything else starts here, so
 * the suite stays well under the login throttle and runs faster.
 */
export async function useSession(page: Page, session: Session, landing = '/dashboard') {
  await page.addInitScript((s: Session) => {
    localStorage.setItem('maos_access_token', s.tokens.accessToken);
    localStorage.setItem('maos_refresh_token', s.tokens.refreshToken);
    localStorage.setItem('maos_user', JSON.stringify(s.user));
    localStorage.setItem('maos_tenant', JSON.stringify(s.tenant));
  }, session);
  await page.goto(landing);
}

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1280) < 1024;

/**
 * The hrefs the workspace navigation offers. On a narrow screen the sidebar is
 * hidden and the compact navigation's Menu opens the same sections in a dialog.
 */
export async function workspaceNavHrefs(page: Page): Promise<string[]> {
  if (isMobile(page)) {
    await page.getByRole('button', { name: 'Menu' }).click();
    const nav = page.getByRole('dialog').getByRole('navigation', { name: 'Workspace' });
    await expect(nav).toBeVisible();
    const hrefs = await nav.locator('a[href]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''));
    await page.keyboard.press('Escape');
    return hrefs;
  }
  // The compact navigation's dialog carries a nav of the same name in the DOM; the sidebar's is the visible one on desktop.
  const nav = page.getByLabel('Primary workspace navigation').getByRole('navigation', { name: 'Workspace' });
  await expect(nav).toBeVisible();
  return nav.locator('a[href]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''));
}

export const offers = (hrefs: string[], prefix: string) => hrefs.some((h) => h === prefix || h.startsWith(`${prefix}/`));
