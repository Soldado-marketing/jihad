import { expect, test, type Page } from '@playwright/test';
import { call, expectStatus } from './support/api';
import { readSeed } from './support/seed';
import { useSession } from './support/ui';

const s = readSeed();

/**
 * G10 - bulk actions on tasks, as the Owner uses them: twenty tasks selected
 * in the list view get a status, a project, an assignee and a label in four
 * actions; each asks first; each task is stored and has its own record; a task
 * that fails stays selected while the others are stored; what a filter hides is
 * no longer selected.
 *
 * Each viewport project gets its own twenty tasks and removes them afterwards.
 */
const COUNT = 20;
const owner = () => s.sessions.owner.tokens.accessToken;

type TaskRow = { id: string; title: string; status: string; projectId: string | null; assignedToUserId: string | null; labels?: { label: { id: string } }[] };
type Activity = { items: { action: string; actor?: { id?: string } | null; actorId?: string | null }[] };

const bar = (page: Page) => page.getByRole('region', { name: 'Bulk actions' });
const tooWide = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe.serial('Bulk actions on tasks', () => {
  let tag: string;
  let ids: string[] = [];
  const project = { from: '', to: '', toName: '' };
  const label = { id: '', name: '' };

  const mine = async () => (await call<TaskRow[]>('/tasks', { token: owner() })).body.filter((t) => ids.includes(t.id));

  /** One chosen action through the bar: the question, nothing changed yet, Apply, the result sentence. */
  async function act(page: Page, select: string, option: string, question: string, result: string | RegExp) {
    await bar(page).getByLabel(select).selectOption({ label: option });
    await expect(bar(page).getByText(question)).toBeVisible();
    await bar(page).getByRole('button', { name: 'Apply' }).click();
    await expect(bar(page).getByText(result)).toBeVisible({ timeout: 30_000 });
  }

  test.beforeAll(async ({}, info) => {
    tag = `bulk${info.project.name}${info.repeatEachIndex}${s.run}`;
    for (const [key, name] of [['from', `Bulk source ${tag}`], ['to', `Bulk target ${tag}`]] as const) {
      const p = await call<{ id: string }>('/projects', { method: 'POST', token: owner(), body: { name } });
      expectStatus(`project ${key}`, p, 201);
      project[key] = p.body.id;
    }
    project.toName = `Bulk target ${tag}`;
    const l = await call<{ id: string }>('/labels', { method: 'POST', token: owner(), body: { name: `review-${tag}`.slice(0, 40), color: '#6366f1' } });
    expectStatus('label', l, 201);
    label.id = l.body.id;
    label.name = `review-${tag}`.slice(0, 40);
    ids = [];
    for (let i = 1; i <= COUNT; i++) {
      const t = await call<{ id: string }>('/tasks', { method: 'POST', token: owner(), body: { title: `${tag} item ${String(i).padStart(2, '0')}`, projectId: project.from } });
      expectStatus(`task ${i}`, t, 201);
      ids.push(t.body.id);
    }
  });

  // Other specs count the employee's tasks and list the projects: everything made here goes again.
  test.afterAll(async () => {
    for (const id of ids) expectStatus('remove task', await call(`/tasks/${id}`, { method: 'DELETE', token: owner() }), 200, 204);
    if (label.id) expectStatus('remove label', await call(`/labels/${label.id}`, { method: 'DELETE', token: owner() }), 200, 204);
    for (const id of [project.from, project.to]) if (id) expectStatus('remove project', await call(`/projects/${id}`, { method: 'DELETE', token: owner() }), 200, 204);
  });

  test('twenty selected tasks get a status, a project, an assignee and a label; each change asks first and is recorded per task', async ({ page }) => {
    test.setTimeout(180_000);
    await useSession(page, s.sessions.owner, `/tasks?view=list&q=${tag}`);
    await expect(page.getByRole('checkbox', { name: new RegExp(`^Select ${tag} item`) })).toHaveCount(COUNT);
    await expect(bar(page)).toHaveCount(0);
    // A task can only be chosen when its name can be read: on a phone the list used to show no titles at all.
    const title = page.getByText(`${tag} item 03`, { exact: true });
    await expect(title).toBeVisible();
    expect((await title.boundingBox())?.width ?? 0, 'the title has room on this screen').toBeGreaterThan(120);

    // One by one, then all that are shown.
    await page.getByRole('checkbox', { name: `Select ${tag} item 03` }).check();
    await expect(bar(page).getByText('1 selected')).toBeVisible();
    await page.getByRole('checkbox', { name: 'Select all tasks shown' }).check();
    await expect(bar(page).getByText(`${COUNT} selected`)).toBeVisible();

    // Status. Choosing asks and changes nothing; "Cancel" leaves everything as it was.
    await bar(page).getByLabel('Set status').selectOption({ label: 'Done' });
    await expect(bar(page).getByText(`Set ${COUNT} tasks to “Done”?`)).toBeVisible();
    expect((await mine()).every((t) => t.status === 'TODO'), 'nothing changes before the question is answered').toBe(true);
    await bar(page).getByRole('button', { name: 'Cancel' }).click();
    expect((await mine()).every((t) => t.status === 'TODO')).toBe(true);
    await act(page, 'Set status', 'Done', `Set ${COUNT} tasks to “Done”?`, `${COUNT} tasks changed.`);
    expect((await mine()).map((t) => t.status)).toEqual(Array(COUNT).fill('DONE'));
    // The selection stays for the next action.
    await expect(bar(page).getByText(`${COUNT} selected`)).toBeVisible();

    // Move: the acceptance case — twenty tasks into another project, stored and recorded.
    await act(page, 'Move to project', project.toName, `Move ${COUNT} tasks to the project “${project.toName}”?`, `${COUNT} tasks changed.`);
    expect((await mine()).map((t) => t.projectId)).toEqual(Array(COUNT).fill(project.to));
    await page.reload();
    await expect(page.getByRole('checkbox', { name: new RegExp(`^Select ${tag} item`) })).toHaveCount(COUNT);
    expect((await mine()).every((t) => t.projectId === project.to), 'the move is still there after a reload').toBe(true);
    for (const id of ids) {
      const history = await call<Activity>(`/activity/task/${id}`, { token: owner() });
      expect(history.status).toBe(200);
      const actions = history.body.items.map((e) => e.action);
      expect(actions.filter((a) => a === 'task.status.changed'), `status record of ${id}`).toHaveLength(1);
      expect(actions.filter((a) => a === 'task.updated'), `move record of ${id}`).toHaveLength(1);
    }

    // Assign and label, on a fresh selection after the reload.
    await page.getByRole('checkbox', { name: 'Select all tasks shown' }).check();
    const employee = s.sessions.employee.user;
    await act(page, 'Assign to', employee.displayName, `Assign ${COUNT} tasks to ${employee.displayName}?`, `${COUNT} tasks changed.`);
    expect((await mine()).map((t) => t.assignedToUserId)).toEqual(Array(COUNT).fill(employee.id));
    await act(page, 'Add label', label.name, `Add the label “${label.name}” to ${COUNT} tasks?`, `${COUNT} tasks changed.`);
    expect((await mine()).every((t) => (t.labels ?? []).some((e) => e.label.id === label.id))).toBe(true);
    // The same label again changes nothing and says so.
    await act(page, 'Add label', label.name, `Add the label “${label.name}” to ${COUNT} tasks?`, `Nothing to change: all ${COUNT} tasks were already set.`);

    expect(await tooWide(page), 'the list with the bar is not wider than the screen').toBeLessThanOrEqual(1);
  });

  test('a task that fails stays selected and the others are stored; a filter drops what it hides from the selection', async ({ page }) => {
    test.setTimeout(120_000);
    await useSession(page, s.sessions.owner, `/tasks?view=list&q=${tag}`);
    await page.getByRole('checkbox', { name: 'Select all tasks shown' }).check();
    await expect(bar(page).getByText(`${COUNT} selected`)).toBeVisible();

    // One of the twenty requests fails on the server.
    const broken = ids[6];
    await page.route(`**/api/tasks/${broken}`, (route) => (route.request().method() === 'PATCH'
      ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Internal server error"}' })
      : route.continue()));
    await bar(page).getByLabel('Set status').selectOption({ label: 'In Review' });
    await bar(page).getByRole('button', { name: 'Apply' }).click();
    const failed = bar(page).getByRole('alert');
    await expect(failed).toContainText(`${COUNT - 1} of ${COUNT} tasks changed. 1 could not be changed and is still selected.`, { timeout: 30_000 });
    await page.unroute(`**/api/tasks/${broken}`);
    await expect(bar(page).getByText('1 selected')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: `Select ${tag} item 07` })).toBeChecked();
    const after = await mine();
    expect(after.filter((t) => t.status === 'IN_REVIEW')).toHaveLength(COUNT - 1);
    expect(after.find((t) => t.id === broken)?.status).toBe('DONE');

    // Trying again for the one that is left works.
    await act(page, 'Set status', 'In Review', 'Set 1 task to “In Review”?', '1 task changed.');
    expect((await mine()).map((t) => t.status)).toEqual(Array(COUNT).fill('IN_REVIEW'));

    // Select all twenty, then narrow the list: what is hidden is no longer selected.
    await page.getByRole('checkbox', { name: 'Select all tasks shown' }).check();
    await expect(bar(page).getByText(`${COUNT} selected`)).toBeVisible();
    await page.getByPlaceholder('Search tasks…').fill(`${tag} item 1`);
    await expect(page.getByRole('checkbox', { name: new RegExp(`^Select ${tag} item`) })).toHaveCount(10);
    await expect(bar(page).getByText('10 selected')).toBeVisible();
    await page.getByPlaceholder('Search tasks…').fill(tag);
    await expect(page.getByRole('checkbox', { name: new RegExp(`^Select ${tag} item`) })).toHaveCount(COUNT);
    await expect(bar(page).getByText('10 selected')).toBeVisible();
    await bar(page).getByRole('button', { name: 'Clear selection' }).click();
    await expect(bar(page)).toHaveCount(0);
    // Leaving the list view drops the selection too.
    await page.getByRole('checkbox', { name: `Select ${tag} item 01` }).check();
    await page.getByRole('button', { name: 'Board' }).click();
    await page.getByRole('button', { name: 'List' }).click();
    await expect(page.getByRole('checkbox', { name: `Select ${tag} item 01` })).not.toBeChecked();
  });

  test('an employee is offered no assignee list and cannot change a task that is not theirs', async ({ page }) => {
    // The twenty tasks were assigned to the employee above, so the employee sees them.
    await useSession(page, s.sessions.employee, `/tasks?view=list&q=${tag}`);
    await page.getByRole('checkbox', { name: `Select ${tag} item 01` }).check();
    await expect(bar(page).getByLabel('Set status')).toBeVisible();
    await expect(bar(page).getByLabel('Assign to')).toHaveCount(0);

    // A task the employee may not see: refused by the routes a bulk action calls, and unchanged.
    const token = s.sessions.employee.tokens.accessToken;
    const before = await call<TaskRow>(`/tasks/${s.sharedTask.id}`, { token: owner() });
    expect((await call(`/tasks/${s.sharedTask.id}`, { method: 'PATCH', token, body: { status: 'DONE' } })).status).toBe(404);
    expect((await call(`/tasks/${s.sharedTask.id}/labels/${label.id}`, { method: 'POST', token })).status).toBe(404);
    const afterwards = await call<TaskRow>(`/tasks/${s.sharedTask.id}`, { token: owner() });
    expect(afterwards.body.status).toBe(before.body.status);
    expect((afterwards.body.labels ?? []).some((e) => e.label.id === label.id)).toBe(false);
  });
});
