import { expect, test, type Page } from '@playwright/test';
import { readSeed, type Seed } from './support/seed';
import { useSession } from './support/ui';

const s = readSeed();

/**
 * F04 - the four states on every page, on screen.
 *
 *  - error: every page is opened while all its reads answer 500; it must say
 *    that something failed, must not stay on "Loading", and must not show the
 *    sentence it shows when there is nothing;
 *  - access denied: a manager and an employee open the pages whose data they
 *    may not read; the page must say so in words and must not stay on "Loading";
 *  - loading: a held request shows the loading state, then the content.
 * The sweeps walk many pages in one test and run on the desktop project only;
 * the states are the same components at phone width.
 */
const WORKSPACE = ['approvals', 'audit', 'calendar', 'chat', 'collaboration', 'complaints', 'control-center', 'crm', 'crm/follow-ups', 'crm/leads', 'crm/meetings',
  'crm/opportunities', 'customers', 'dashboard', 'files', 'finance', 'finance/costs', 'finance/invoices', 'finance/payments', 'finance/revenue', 'my-work',
  'notifications', 'projects', 'reports', 'requests', 'settings', 'tasks', 'team/invitations', 'team/members', 'team/requests', 'time', 'voice', 'voice/task-drafts'];
const CLIENT = ['client', 'client/appointments', 'client/deliveries', 'client/invoices', 'client/notifications', 'client/problems', 'client/requests'];
const withIds = (seed: Seed) => ({
  workspace: [`projects/${seed.project.id}`, `projects/${seed.project.id}/board`, `customers/${seed.customerOne.id}`, `files/${seed.files.desktop.id}`, `finance/invoices/${seed.invoice.id}`, `tasks/${seed.sharedTask.id}`],
  client: [`client/deliveries/${seed.files.desktop.deliveryId}`, `client/invoices/${seed.invoice.id}`],
});

/** What a page says when a load failed: the API's sentence for a server fault, or the page's own. */
const FAILED = /Something went wrong on our side|could not be (loaded|opened)|Could not load|unable to load|Failed to load/i;
/** What a page says when the person may not read it. */
const REFUSED = /You do not have permission to view this page\.|Access denied|available to company owners only/;
/** Sentences for "nothing here": none of them may stand beside a failed load. */
const NOTHING = /No [A-Za-z ]{3,40}(yet|found|planned|scheduled|right now)\.?|Nothing [a-z ]{3,40}\.|[A-Za-z ]{3,20}not found\.|You are all set|All invoices are paid|No notifications\./;

const main = (page: Page) => page.locator('main').first();

async function allReadsFail(page: Page) {
  // Every read, the member list under /api/auth/ included; sign-in and token renewal are POSTs and pass.
  await page.route((url) => url.pathname.startsWith('/api/'), (r) =>
    r.request().method() === 'GET' ? r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ statusCode: 500, message: 'Internal server error' }) }) : r.continue());
}

test.describe('The four states on every page', () => {
  test.beforeEach(({}, info) => { test.skip(info.project.name !== 'desktop', 'The sweeps run on the desktop project.'); });

  test('error: every workspace page says that its load failed, stops loading and shows no empty sentence', async ({ page }) => {
    test.setTimeout(180_000);
    await allReadsFail(page);
    for (const route of [...WORKSPACE, ...withIds(s).workspace]) {
      await useSession(page, s.sessions.owner, `/${route}`);
      await expect(main(page), `/${route} says that the load failed`).toContainText(FAILED);
      await expect(main(page), `/${route} is not still loading`).not.toContainText('Loading');
      await expect(main(page), `/${route} shows no empty sentence beside the failure`).not.toContainText(NOTHING);
    }
  });

  test('error: every client page says that its load failed, stops loading and shows no empty sentence', async ({ page }) => {
    test.setTimeout(120_000);
    await allReadsFail(page);
    for (const route of [...CLIENT, ...withIds(s).client]) {
      await useSession(page, s.sessions.clientOne, `/${route}`);
      await expect(main(page), `/${route} says that the load failed`).toContainText(FAILED);
      await expect(main(page), `/${route} is not still loading`).not.toContainText('Loading');
      await expect(main(page), `/${route} shows no empty sentence beside the failure`).not.toContainText(NOTHING);
    }
  });

  const refused: [who: 'manager' | 'employee', routes: string[]][] = [
    ['manager', ['audit', 'control-center', 'finance', 'finance/costs', 'finance/invoices', 'finance/payments', 'finance/revenue', 'team/invitations', 'team/requests']],
    ['employee', ['audit', 'complaints', 'control-center', 'crm', 'crm/follow-ups', 'crm/leads', 'crm/meetings', 'crm/opportunities', 'finance', 'finance/costs',
      'finance/invoices', 'finance/payments', 'finance/revenue', 'requests', 'team/invitations', 'team/requests']],
  ];
  for (const [who, routes] of refused) {
    test(`access denied: a ${who} is told in words on every page whose data the role may not read`, async ({ page }) => {
      test.setTimeout(120_000);
      for (const route of routes) {
        await useSession(page, s.sessions[who], `/${route}`);
        await expect(main(page), `/${route} tells the ${who} it is not theirs`).toContainText(REFUSED);
        await expect(main(page), `/${route} is not still loading`).not.toContainText('Loading');
      }
    });
  }

  test('loading: the chat shows that channels are loading, then what there is', async ({ page }) => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route((url) => url.pathname === '/api/chat/channels', async (r) => { await held; await r.continue(); });
    await useSession(page, s.sessions.owner, '/chat');
    await expect(page.getByText('Loading channels')).toBeVisible();
    await expect(page.getByText('No channels yet.')).toHaveCount(0);
    release();
    await expect(page.getByText('Loading channels')).toHaveCount(0);
  });
});
