import { expect, test, type Page } from '@playwright/test';
import { call, expectStatus } from './support/api';
import { readSeed } from './support/seed';
import { useSession } from './support/ui';

const s = readSeed();

/**
 * G07 - the comment thread of a task, as people meet it: the Owner writes a
 * comment and mentions the employee the task belongs to; the comment is still
 * there after a reload; the employee finds a notice in the bell, follows it to
 * the task, answers, and can change only their own words. A client never
 * reaches a comment.
 *
 * Each viewport project gets its own task, so desktop and mobile do not read
 * each other's threads.
 */
const MENTION_NOTICE = 'You were mentioned in a task comment';
const ownerToken = () => s.sessions.owner.tokens.accessToken;
const employee = () => s.sessions.employee.user;

type Note = { id: string; body: string; createdBy: { id: string } | null; mentions: { id: string }[] };
type Notice = { title: string; body?: string | null; resourceType?: string | null; resourceId?: string | null };

async function openTask(page: Page, title: string) {
  await page.getByText(title).first().click();
  await expect(page.getByPlaceholder('Task title')).toHaveValue(title);
  await expect(page.getByTestId('task-comments')).toBeVisible();
}

const thread = (page: Page) => page.getByRole('list', { name: 'Comments' });
const box = (page: Page) => page.getByRole('textbox', { name: 'Write a comment' });
const tooWide = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe.serial('Task comments with mentions', () => {
  let task: { id: string; title: string };

  test.beforeAll(async ({}, info) => {
    // Unique per round as well, so a repeated run does not find the notice of an earlier round.
    const title = `Comment thread ${info.project.name} ${info.repeatEachIndex} ${s.run}`;
    const created = await call<{ id: string }>('/tasks', { method: 'POST', token: ownerToken(), body: { title, assignedToUserId: employee().id } });
    expectStatus('task for the thread', created, 201);
    task = { id: created.body.id, title };
  });

  // The task goes when the round is over, and its thread with it: other specs
  // count the employee's tasks and measure the general notes list.
  test.afterAll(async () => {
    if (!task) return;
    expectStatus('remove the task', await call(`/tasks/${task.id}`, { method: 'DELETE', token: ownerToken() }), 200, 204);
    const left = await call<Note[]>('/collaboration/notes', { token: ownerToken() });
    expect(left.body.filter((n) => (n as Note & { resourceId?: string }).resourceId === task.id)).toEqual([]);
  });

  test('the Owner writes a comment, mentions the employee by picking the name, and the thread is still there after a reload', async ({ page }) => {
    await useSession(page, s.sessions.owner, '/tasks');
    await openTask(page, task.title);
    await expect(page.getByText('No comments yet. Write the first one below.')).toBeVisible();
    await expect(page.getByText('Internal — clients never see these comments.')).toBeVisible();

    // Typing "@" and the start of a name offers the people who may read this thread.
    await box(page).click();
    await box(page).pressSequentially(`Please check the cut, @${employee().displayName.slice(0, 3)}`);
    const offered = page.getByRole('listbox', { name: 'People you can mention' });
    await expect(offered).toBeVisible();
    // Never a client, and not the writer.
    await expect(offered.getByRole('option', { name: s.sessions.clientOne.user.displayName })).toHaveCount(0);
    await expect(offered.getByRole('option', { name: s.sessions.owner.user.displayName, exact: true })).toHaveCount(0);
    await offered.getByRole('option', { name: employee().displayName, exact: true }).click();
    await expect(offered).toHaveCount(0);
    await expect(box(page)).toHaveValue(`Please check the cut, @${employee().displayName} `);
    await box(page).pressSequentially('before Friday.');
    await page.getByRole('button', { name: 'Comment', exact: true }).click();

    const first = thread(page).getByRole('listitem').first();
    await expect(first).toContainText(`Please check the cut, @${employee().displayName} before Friday.`);
    await expect(first).toContainText(s.sessions.owner.user.displayName);
    await expect(first.locator(`[data-mention="${employee().id}"]`)).toHaveText(`@${employee().displayName}`);
    await expect(box(page)).toHaveValue('');

    // A second comment, one long unbroken word: the editor must still fit the screen.
    await box(page).fill(`Reference: ${'longreference'.repeat(16)}`);
    await page.getByRole('button', { name: 'Comment', exact: true }).click();
    await expect(thread(page).getByRole('listitem')).toHaveCount(2);
    expect(await tooWide(page), 'the page is not wider than the screen with the thread open').toBeLessThanOrEqual(1);

    // The thread persists: stored on the task, and shown again in the same order.
    const stored = await call<Note[]>(`/collaboration/notes?resourceType=task&resourceId=${task.id}`, { token: ownerToken() });
    expect(stored.body).toHaveLength(2);
    expect(stored.body[1].mentions.map((m) => m.id)).toEqual([employee().id]);
    await page.reload();
    await openTask(page, task.title);
    const items = thread(page).getByRole('listitem');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText('Please check the cut');
    await expect(items.nth(1)).toContainText('Reference: longreference');
    await expect(items.nth(0).locator(`[data-mention="${employee().id}"]`)).toHaveText(`@${employee().displayName}`);

    // The employee was told once; the notice names the task and does not carry the comment.
    const notices = await call<Notice[]>('/notifications', { token: s.sessions.employee.tokens.accessToken });
    const mine = notices.body.filter((n) => n.title === MENTION_NOTICE && n.resourceId === task.id);
    expect(mine).toHaveLength(1);
    expect(mine[0].body).toBe(task.title);
    expect(JSON.stringify(mine[0])).not.toContain('before Friday');
  });

  test('the employee follows the notice in the bell to the task, answers, and can change only their own comment', async ({ page }) => {
    await useSession(page, s.sessions.employee, '/dashboard');
    await page.getByRole('button', { name: /^Notifications/ }).click();
    const notice = page.getByRole('menu').getByRole('link').filter({ hasText: MENTION_NOTICE }).filter({ hasText: task.title });
    await expect(notice).toBeVisible();
    await notice.click();

    // The notice opens that task's editor on the board, and the address is clean again.
    await expect(page.getByPlaceholder('Task title')).toHaveValue(task.title);
    await expect(page).toHaveURL(/\/tasks$/);
    const items = thread(page).getByRole('listitem');
    await expect(items).toHaveCount(2);
    // Someone else's comment offers no control to an employee.
    await expect(items.nth(0).getByRole('button')).toHaveCount(0);

    await box(page).fill('Second cut is uploaded.');
    await page.getByRole('button', { name: 'Comment', exact: true }).click();
    await expect(items).toHaveCount(3);
    const own = items.nth(2);
    await expect(own).toContainText('Second cut is uploaded.');
    await expect(own).toContainText(employee().displayName);

    await own.getByRole('button', { name: 'Edit' }).click();
    const editor = page.getByRole('textbox', { name: 'Edit comment' });
    await expect(editor).toHaveValue('Second cut is uploaded.');
    await editor.fill('Second cut is uploaded, with the new titles.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(own).toContainText('Second cut is uploaded, with the new titles.');
    await expect(own).toContainText('edited');

    // Deleting asks first, and "Keep" keeps.
    await own.getByRole('button', { name: 'Delete' }).click();
    await own.getByRole('button', { name: 'Keep' }).click();
    await expect(items).toHaveCount(3);
    await own.getByRole('button', { name: 'Delete' }).click();
    await own.getByRole('button', { name: 'Yes, delete' }).click();
    await expect(items).toHaveCount(2);
    const stored = await call<Note[]>(`/collaboration/notes?resourceType=task&resourceId=${task.id}`, { token: ownerToken() });
    expect(stored.body).toHaveLength(2);
    expect(stored.body.every((n) => n.createdBy?.id === s.sessions.owner.user.id)).toBe(true);
  });

  test('a failed load says so and offers another try; a client reaches no comment', async ({ page }) => {
    await useSession(page, s.sessions.manager, '/tasks');
    await page.route('**/api/collaboration/notes?**', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Internal server error"}' }));
    await page.getByText(task.title).first().click();
    const failed = page.getByTestId('task-comments').getByRole('alert');
    await expect(failed).toContainText('Comments could not be loaded.');
    await expect(page.getByText('No comments yet.')).toHaveCount(0);
    await page.unroute('**/api/collaboration/notes?**');
    await failed.getByRole('button', { name: 'Try again' }).click();
    await expect(thread(page).getByRole('listitem')).toHaveCount(2);
    // A manager may remove anyone's comment, and nobody but the author may edit it.
    const first = thread(page).getByRole('listitem').first();
    await expect(first.getByRole('button', { name: 'Delete' })).toBeVisible();
    await expect(first.getByRole('button', { name: 'Edit' })).toHaveCount(0);

    // Someone the API refuses (a contractor, by the permissions as they are) gets no Comments section at all.
    await page.route('**/api/collaboration/notes?**', (route) => route.fulfill({ status: 403, contentType: 'application/json', body: '{"code":"FORBIDDEN"}' }));
    await page.reload();
    await page.getByText(task.title).first().click();
    await expect(page.getByPlaceholder('Task title')).toHaveValue(task.title);
    await expect(page.getByRole('button', { name: /^Attachments/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Comments/ })).toHaveCount(0);
    await expect(page.getByTestId('task-comments')).toHaveCount(0);
    await page.unroute('**/api/collaboration/notes?**');

    const clientToken = s.sessions.clientOne.tokens.accessToken;
    for (const path of [`/collaboration/notes?resourceType=task&resourceId=${task.id}`, '/collaboration/notes', `/collaboration/notes/mentionable?resourceType=task&resourceId=${task.id}`]) {
      const r = await call(path, { token: clientToken });
      expect(r.status, `${path} for a client`).toBe(403);
      expect(JSON.stringify(r.body)).not.toContain('Please check the cut');
    }
  });
});
