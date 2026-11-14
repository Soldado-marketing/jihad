import { expect, test } from '@playwright/test';
import { call } from './support/api';
import { readSeed } from './support/seed';
import { useSession } from './support/ui';

const s = readSeed();

/**
 * D08 — project status in the client portal. The company shares a project and
 * some of its work steps; the client then reads, in My Work, where the project
 * stands: its state, a bar and four numbers — and nothing that names a step.
 * The other client sees none of it.
 */
test.describe('Client project status', () => {
  const made = { id: '', name: '', titles: [] as string[] };

  test.beforeAll(async ({}, info) => {
    const tag = `${info.project.name} ${s.run} ${Date.now().toString(36)}`;
    const owner = s.sessions.owner.tokens.accessToken;
    made.name = `Status film (${tag})`;
    const p = await call<{ id: string }>('/projects', { method: 'POST', token: owner, body: { name: made.name, customerId: s.customerOne.id } });
    expect(p.status, JSON.stringify(p.body)).toBe(201);
    made.id = p.body.id;
    expect((await call(`/projects/${made.id}`, { method: 'PATCH', token: owner, body: { clientVisible: true } })).status).toBe(200);

    // Shared: one planned, one in progress, one blocked (shown as in progress), one in review, one done.
    // Not counted: a finished step that was not shared, and a shared step that was archived.
    const steps: [string, boolean][] = [['TODO', true], ['IN_PROGRESS', true], ['BLOCKED', true], ['IN_REVIEW', true], ['DONE', true], ['DONE', false], ['ARCHIVED', true]];
    for (const [i, [status, shared]] of steps.entries()) {
      const title = `Hidden step name ${i} (${tag})`;
      made.titles.push(title);
      const t = await call<{ id: string }>('/tasks', { method: 'POST', token: owner, body: { title, projectId: made.id, status } });
      expect(t.status, JSON.stringify(t.body)).toBe(201);
      if (shared) expect((await call(`/tasks/${t.body.id}`, { method: 'PATCH', token: owner, body: { clientVisible: true } })).status).toBe(200);
    }
  });

  test('the client reads the state, the finished share and the four numbers of the project', async ({ page }) => {
    await useSession(page, s.sessions.clientOne, `/client/deliveries?project=${made.id}`);
    const panel = page.getByTestId('project-progress');
    await expect(panel.getByRole('heading', { name: 'Project status' })).toBeVisible();
    const card = panel.getByTestId('project-progress-card');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(made.name);
    await expect(card).toContainText('1 of 5 work steps done');

    const bar = card.getByRole('progressbar');
    await expect(bar).toHaveAttribute('aria-valuenow', '20');
    await expect(bar).toHaveAttribute('aria-label', `${made.name}: 1 of 5 work steps done`);

    const numbers = await card.locator('dl > div').evaluateAll((rows) => rows.map((r) => [r.querySelector('dt')?.textContent, r.querySelector('dd')?.textContent]));
    expect(numbers).toEqual([['Planned', '1'], ['In progress', '2'], ['In review', '1'], ['Done', '1']]);

    // Numbers only: no step is named and nothing in the panel can be opened.
    const text = await panel.innerText();
    for (const title of made.titles) expect(text).not.toContain(title);
    expect(text).not.toMatch(/task|blocked|archived|assigned/i);
    await expect(panel.getByRole('link')).toHaveCount(0);
    await expect(panel.getByRole('button')).toHaveCount(0);

    // The deliveries of My Work are still there, and the page fits the screen.
    await expect(page.getByRole('heading', { name: /Waiting for your review/ })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('without a chosen project every shared project is listed, and the project can be chosen', async ({ page }) => {
    await useSession(page, s.sessions.clientOne, '/client/deliveries');
    const panel = page.getByTestId('project-progress');
    await expect(panel.getByTestId('project-progress-card').filter({ hasText: made.name })).toHaveCount(1);
    await expect(panel.getByTestId('project-progress-card').filter({ hasText: s.project.name })).toHaveCount(1);

    // The new project has no delivery yet; it can still be chosen.
    await page.getByRole('combobox').selectOption({ label: made.name });
    await expect(panel.getByTestId('project-progress-card')).toHaveCount(1);
    await expect(panel.getByTestId('project-progress-card')).toContainText(made.name);
  });

  test('the other client sees nothing of the project, in the page and in the API', async ({ page }) => {
    const api = await call<{ id: string; name: string }[]>('/client/progress', { token: s.sessions.clientTwo.tokens.accessToken });
    expect(api.status).toBe(200);
    expect(JSON.stringify(api.body)).not.toContain(made.id);
    expect(JSON.stringify(api.body)).not.toContain(made.name);

    await useSession(page, s.sessions.clientTwo, `/client/deliveries?project=${made.id}`);
    await expect(page.getByRole('heading', { name: /Waiting for your review/ })).toBeVisible();
    await expect(page.getByText(made.name)).toHaveCount(0);
    await expect(page.getByTestId('project-progress-card')).toHaveCount(0);
  });

  test('the API answer for the client holds numbers only', async () => {
    const api = await call<{ id: string; steps: Record<string, number> }[]>('/client/progress', { token: s.sessions.clientOne.tokens.accessToken });
    expect(api.status).toBe(200);
    const mine = api.body.find((p) => p.id === made.id);
    expect(mine?.steps).toEqual({ total: 5, planned: 1, inProgress: 2, inReview: 1, done: 1 });
    for (const title of made.titles) expect(JSON.stringify(api.body)).not.toContain(title);
    expect((await call('/client/progress', { token: s.sessions.employee.tokens.accessToken })).status).toBe(403);
    expect((await call('/client/progress')).status).toBe(401);
  });
});
