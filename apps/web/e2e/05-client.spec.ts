import { expect, test } from '@playwright/test';
import { call } from './support/api';
import { fileFor, readSeed } from './support/seed';
import { signIn, useSession } from './support/ui';

const s = readSeed();
const INTERNAL = 'a[href^="/finance"], a[href^="/crm"], a[href^="/audit"], a[href^="/team"], a[href^="/dashboard"], a[href^="/projects"], a[href^="/tasks"], a[href^="/files"]';

test.describe('CLIENT', () => {
  test('signs in to the portal, sees only its own project, and is sent back from internal URLs', async ({ page }) => {
    await signIn(page, s.clientOne); // the one real client sign-in of this project
    await expect(page).toHaveURL(/\/client$/);
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
    await expect(page.locator(INTERNAL)).toHaveCount(0);
    await page.goto('/client/projects');
    // Shown text, not the project filter's <option> (the filter appears once a client has several shared projects, D08).
    await expect(page.getByText(s.project.name).and(page.locator(':not(option)')).first()).toBeVisible();
    await expect(page.getByText(s.internalProject.name)).toHaveCount(0);
    for (const internal of ['/dashboard', '/projects', '/finance', '/files']) {
      await page.goto(internal);
      await expect(page).toHaveURL(/\/client/);
    }
    const token = s.sessions.clientOne.tokens.accessToken;
    expect((await call('/projects', { token })).status).toBe(403);
    expect((await call('/tasks', { token })).status).toBe(403);
    expect((await call('/files', { token })).status).toBe(403);
    expect((await call('/tasks', { method: 'POST', token, body: { title: `forbidden ${s.run}` } })).status).toBe(403);
  });

  test('approves one delivery and the approval is stored', async ({ page }, info) => {
    const file = fileFor(s, info.project.name);
    await useSession(page, s.sessions.clientOne, '/client/deliveries');
    await expect(page.getByText(file.name).first()).toBeVisible();
    await page.getByRole('link', { name: new RegExp(file.name) }).first().click();
    await expect(page).toHaveURL(new RegExp(`/client/deliveries/${file.deliveryId}`));
    // The delivered image itself is served to the client (content route through the client copy).
    const img = page.getByRole('img', { name: file.name });
    await expect(img).toBeVisible();
    expect(await img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Approve' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Thank you, the delivery is approved.')).toBeVisible();
    const deliveries = await call<{ id: string; status: string }[]>('/client/deliveries', { token: s.sessions.clientOne.tokens.accessToken });
    expect(deliveries.body.find((d) => d.id === file.deliveryId)?.status).toBe('APPROVED');
  });

  test('sends another delivery back for revision and the company sees the note', async ({ page }, info) => {
    const file = fileFor(s, info.project.name, 'revision');
    const note = `Please make the logo larger (${info.project.name} ${s.run}).`;
    await useSession(page, s.sessions.clientOne, `/client/deliveries/${file.deliveryId}`);
    await page.getByRole('textbox').fill(note);
    await page.getByRole('button', { name: 'Request revision' }).click();
    await expect(page.getByText(/we will work on your revision/)).toBeVisible();
    const rounds = await call<{ id: string; status: string; decisions: { decision: string; note: string | null }[] }[]>(`/deliveries/file/${file.id}`, { token: s.sessions.owner.tokens.accessToken });
    const round = rounds.body.find((r) => r.id === file.deliveryId);
    expect(round?.status).toBe('CHANGES_REQUESTED');
    expect(round?.decisions.some((d) => d.decision === 'REQUEST_CHANGES' && d.note === note)).toBe(true);
  });

  test('reads the invoice (with its PDF) and confirms the appointment', async ({ page }) => {
    await useSession(page, s.sessions.clientOne, '/client/invoices');
    await expect(page.getByText(`Invoice ${s.invoice.number}`)).toBeVisible();
    const token = s.sessions.clientOne.tokens.accessToken;
    expect((await call(`/client/invoices/${s.invoice.id}/pdf`, { token })).status).toBe(200);
    await page.goto('/client/appointments');
    await expect(page.getByText(s.appointment.title)).toBeVisible();
    await expect(page.getByText(s.appointment.location)).toBeVisible();
    const confirm = page.getByRole('button', { name: /I've seen this appointment|confirm again/ });
    if (await confirm.count()) {
      await confirm.first().click();
      await expect(page.getByText('Seen ✓')).toBeVisible();
    } else {
      await expect(page.getByText('Seen ✓')).toBeVisible(); // confirmed by the other viewport project already
    }
    // No staff name reaches the client.
    await expect(page.getByText(s.owner.fullName)).toHaveCount(0);
    await expect(page.getByText(s.employee.fullName)).toHaveCount(0);
  });

  test('requests new work and the request reaches management', async ({ page }, info) => {
    const subject = `New landing page (${info.project.name} ${s.run})`;
    await useSession(page, s.sessions.clientOne, '/client/requests');
    await page.getByRole('button', { name: 'Request new work' }).click();
    await page.getByPlaceholder('A short title').fill(subject);
    await page.getByPlaceholder(/Describe the work you need/).fill('We need a landing page for the spring campaign, two sections and a form.');
    await page.getByRole('button', { name: 'Send to management' }).click();
    await expect(page.getByText(subject)).toBeVisible();
    const forOwner = await call<{ subject: string }[]>('/requests', { token: s.sessions.owner.tokens.accessToken });
    expect(forOwner.status).toBe(200);
    expect(forOwner.body.map((r) => r.subject)).toContain(subject);
    const forEmployee = await call('/requests', { token: s.sessions.employee.tokens.accessToken });
    expect(forEmployee.status, 'requests are management-only').toBe(403);
  });
});
