import { expect, test } from '@playwright/test';
import { call } from './support/api';
import { readSeed } from './support/seed';
import { useSession } from './support/ui';

const s = readSeed();

/**
 * D07 — the History tab of Customer 360. A client reports a problem and asks
 * for new work, management leaves an internal note and an answer; the OWNER
 * then reads all of it in one list on the customer, an EMPLOYEE reads none of
 * it, and the client cannot call the history at all.
 */
test.describe('Customer history', () => {
  const made = { subject: '', request: '', note: '', answer: '' };

  test.beforeAll(async ({}, info) => {
    const tag = `${info.project.name} ${s.run} ${Date.now().toString(36)}`;
    made.subject = `Sound too quiet (${tag})`;
    made.request = `Teaser cut (${tag})`;
    made.note = `Internal: check the mix before answering (${tag})`;
    made.answer = `We are fixing the sound (${tag})`;
    const client = s.sessions.clientOne.tokens.accessToken;
    const owner = s.sessions.owner.tokens.accessToken;
    const problem = await call<{ id: string }>('/client/problems', { method: 'POST', token: client, body: { subject: made.subject, body: 'The voice is hard to hear in the second half.' } });
    expect(problem.status, JSON.stringify(problem.body)).toBe(201);
    const request = await call<{ id: string }>('/client/requests', { method: 'POST', token: client, body: { subject: made.request, body: 'Please cut a 15 second teaser from the film.' } });
    expect(request.status, JSON.stringify(request.body)).toBe(201);
    const note = await call(`/complaints/${problem.body.id}/messages`, { method: 'POST', token: owner, body: { body: made.note, internal: true } });
    expect(note.status, JSON.stringify(note.body)).toBe(201);
    const answer = await call(`/complaints/${problem.body.id}/messages`, { method: 'POST', token: owner, body: { body: made.answer } });
    expect(answer.status, JSON.stringify(answer.body)).toBe(201);
  });

  test('the OWNER reads the report, the request, the answer and the internal note in one list, and can filter it', async ({ page }) => {
    await useSession(page, s.sessions.owner, `/customers/${s.customerOne.id}`);
    await page.getByRole('tab', { name: 'History' }).click();
    const history = page.getByTestId('customer-history');
    await expect(history).toBeVisible();

    await expect(history.getByRole('link', { name: made.subject }).first()).toBeVisible();
    await expect(history.getByRole('link', { name: made.request }).first()).toBeVisible();
    await expect(history.getByText('The client reported a problem').first()).toBeVisible();
    await expect(history.getByText('The client requested new work').first()).toBeVisible();
    await expect(history.getByText(made.answer)).toBeVisible();

    // The internal note is there for management, and marked.
    const noteRow = history.locator('li', { hasText: made.note });
    await expect(noteRow).toHaveCount(1);
    await expect(noteRow.getByText('Internal note').first()).toBeVisible();
    await expect(noteRow).toHaveAttribute('data-kind', 'problem');

    // The record opens from the entry.
    await expect(history.getByRole('link', { name: made.subject }).first()).toHaveAttribute('href', '/complaints');

    // Filter: only work requests remain.
    await history.getByRole('button', { name: 'Work requests' }).click();
    await expect(history.getByRole('link', { name: made.request }).first()).toBeVisible();
    await expect(history.getByText(made.note)).toHaveCount(0);
    await expect(history.locator('li[data-kind="problem"]')).toHaveCount(0);
    await history.getByRole('button', { name: 'Everything' }).click();
    await expect(history.getByText(made.note)).toHaveCount(1);

    // Readable without sideways scrolling, on the phone-width project too.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'the page does not scroll sideways').toBeLessThanOrEqual(1);
  });

  test('an EMPLOYEE sees no problem report, no request and no internal note there', async ({ page }) => {
    await useSession(page, s.sessions.employee, `/customers/${s.customerOne.id}`);
    await page.getByRole('tab', { name: 'History' }).click();
    // Either entries of the employee's own sections or the empty line; never the conversations.
    await expect(page.getByTestId('customer-history').or(page.getByText('Nothing has happened with this customer yet.'))).toBeVisible();
    await expect(page.getByText(made.subject)).toHaveCount(0);
    await expect(page.getByText(made.request)).toHaveCount(0);
    await expect(page.getByText(made.note)).toHaveCount(0);
    await expect(page.getByText('Internal note')).toHaveCount(0);

    const api = await call<{ sections: string[]; items: { kind: string; internal?: boolean }[] }>(`/customers/${s.customerOne.id}/history`, { token: s.sessions.employee.tokens.accessToken });
    expect(api.status).toBe(200);
    expect(api.body.sections).not.toContain('conversations');
    expect(api.body.items.filter((e) => e.kind === 'problem' || e.kind === 'request' || e.internal)).toEqual([]);
  });

  test('a CLIENT cannot read the history, and the client\'s own report shows no internal note', async () => {
    const token = s.sessions.clientOne.tokens.accessToken;
    expect((await call(`/customers/${s.customerOne.id}/history`, { token })).status).toBe(403);
    const mine = await call<unknown[]>('/client/problems', { token });
    expect(mine.status).toBe(200);
    const text = JSON.stringify(mine.body);
    expect(text).toContain(made.subject);
    expect(text).not.toContain(made.note);
    // The other customer's client is refused as well, and the other company cannot see this customer.
    expect((await call(`/customers/${s.customerOne.id}/history`, { token: s.sessions.clientTwo.tokens.accessToken })).status).toBe(403);
    expect((await call(`/customers/${s.customerOne.id}/history`, { token: s.sessions.otherOwner.tokens.accessToken })).status).toBe(404);
  });
});
