import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { call, expectStatus, loginSession, type Person, type Session } from './support/api';
import { readSeed } from './support/seed';
import { signIn } from './support/ui';

const s = readSeed();

/**
 * E08 - access revocation, as a signed-in person meets it. An employee has the
 * workspace open; the Owner removes them from the company (or suspends the
 * account); the employee's next step in the open page lands on the sign-in
 * page, the local session is gone, and signing in again is refused.
 *
 * Removal and suspension are one-way, so every test uses its own person and
 * each viewport project (desktop, mobile) gets its own pair:
 *  - on the disposable stack the Owner invites them here (the API runs without
 *    a mail provider and answers with the invite link);
 *  - against a deployed environment invitations are e-mailed, so the operator
 *    seeds the people and names them in E2E_REVOCATION_PEOPLE_FILE:
 *    { "desktop": { "removed": Person, "suspended": Person }, "mobile": { ... } }.
 *    Without that file these tests are skipped there, never faked.
 */
type Kind = 'removed' | 'suspended';
const BOUND_MS = 60_000;
const seededPeople: Record<string, Record<Kind, Person>> | null = process.env.E2E_REVOCATION_PEOPLE_FILE
  ? JSON.parse(readFileSync(process.env.E2E_REVOCATION_PEOPLE_FILE, 'utf8'))
  : null;
const deployed = Boolean(process.env.E2E_PEOPLE_FILE);

// Each fictional person acts from its own documentation-range address, as the
// seed does: the per-address limits on sign-in and on accepting an invitation
// stay in force and are not what this spec measures.
let device = 0;
const ownAddress = () => `203.0.113.${(device = (device % 250) + 1)}`;

async function member(kind: Kind, projectName: string): Promise<{ person: Person; session: Session }> {
  const ownerToken = s.sessions.owner.tokens.accessToken;
  let person: Person;
  if (seededPeople) {
    person = seededPeople[projectName === 'mobile' ? 'mobile' : 'desktop'][kind];
  } else {
    person = { email: `${kind}-${projectName}-${s.run}@example.test`, password: randomBytes(18).toString('base64url'), fullName: `E2E ${kind} ${projectName}` };
    const inv = await call<{ inviteUrl?: string }>('/admin/invites', { method: 'POST', token: ownerToken, body: { email: person.email, role: 'EMPLOYEE' } });
    expectStatus('invite', inv, 201);
    const token = new URL(inv.body.inviteUrl ?? '').searchParams.get('token');
    expectStatus('accept', await call('/auth/invites/accept', { method: 'POST', fromIp: ownAddress(), body: { token, fullName: person.fullName, password: person.password } }), 200, 201);
  }
  const session = await loginSession(person, s.company.slug);
  return { person: { ...person, id: session.user.id }, session };
}

/**
 * Signed in once, as the sign-in page leaves the browser (lib/auth.ts). Not
 * `useSession`: its init script writes the session again on every navigation,
 * which would hide whether the app really cleared it.
 */
async function openAs(page: Page, session: Session, landing: string) {
  await page.goto('/auth/login');
  await page.evaluate((x: Session) => {
    localStorage.setItem('maos_access_token', x.tokens.accessToken);
    localStorage.setItem('maos_refresh_token', x.tokens.refreshToken);
    localStorage.setItem('maos_user', JSON.stringify(x.user));
    localStorage.setItem('maos_tenant', JSON.stringify(x.tenant));
  }, session);
  await page.goto(landing);
}

/** The open page is sent to the sign-in page and keeps nothing of the old session. */
async function expectSignedOut(page: Page) {
  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  const left = await page.evaluate(() => ['maos_access_token', 'maos_refresh_token'].filter((k) => localStorage.getItem(k) !== null));
  expect(left).toEqual([]);
}

test.describe('Access ends at once for a signed-in member', () => {
  test.skip(deployed && !seededPeople, 'Against a deployed environment the operator seeds the people (E2E_REVOCATION_PEOPLE_FILE).');

  for (const [kind, act, sentence] of [
    ['removed', (id: string) => `/auth/company-members/${id}/remove`, 'Your account is approved but has no active workspace membership. Contact your administrator.'],
    ['suspended', (id: string) => `/admin/users/${id}/suspend`, 'Your account has been suspended. Please contact support.'],
  ] as const) {
    test(`an employee who is ${kind} lands on the sign-in page at the next step and cannot sign in again`, async ({ page }, testInfo) => {
      const { person, session } = await member(kind, testInfo.project.name);

      // Signed in and working: the task list answers for this person.
      await openAs(page, session, '/tasks');
      await expect(page).toHaveURL(/\/tasks/);
      expect((await call('/tasks', { token: session.tokens.accessToken })).status).toBe(200);

      const startedAt = Date.now();
      expectStatus(kind, await call(act(person.id as string), { method: 'POST', token: s.sessions.owner.tokens.accessToken }), 200, 201);

      // The next step in the open page: its first request is refused, the
      // refresh is refused too, and the app sends the person to sign in.
      await page.goto('/projects');
      await expectSignedOut(page);
      const elapsed = Date.now() - startedAt;
      expect(elapsed, `signed out ${elapsed} ms after the Owner's action`).toBeLessThan(BOUND_MS);

      // The old tokens are refused by the API itself, not only hidden by the page.
      expect((await call('/tasks', { token: session.tokens.accessToken })).status).toBe(401);
      expect((await call('/auth/refresh', { method: 'POST', body: { refreshToken: session.tokens.refreshToken } })).status).toBe(401);

      // Signing in again, as the person would try: refused, with a sentence that says why, and no session.
      await signIn(page, person);
      // Next.js also renders a route announcer with role=alert, so pick the banner by its text.
      await expect(page.getByRole('alert').filter({ hasText: sentence })).toBeVisible();
      await expectSignedOut(page);
      const again = await call<{ tokens?: unknown }>('/auth/login', {
        method: 'POST', fromIp: ownAddress(), body: { email: person.email, passwordOrMagicCode: person.password, tenantSlug: s.company.slug },
      });
      expect(again.status).not.toBe(200);
      expect(again.body?.tokens).toBeUndefined();

      // Nobody else lost anything: the Owner still works.
      expect((await call('/auth/me', { token: s.sessions.owner.tokens.accessToken })).status).toBe(200);
    });
  }
});
