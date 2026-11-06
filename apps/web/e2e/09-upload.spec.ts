/**
 * C06 - upload progress, cancel and error recovery in the browser, desktop and
 * mobile.
 *
 * Each test creates its own file asset through the API, so the counts it
 * checks are exact. The network is shaped from the browser side with
 * Playwright routes: a held request shows the running state and lets Cancel be
 * exercised; an aborted request is a lost connection; a request that reaches
 * the server but whose answer is dropped is the duplicate-version hazard; a
 * 503 is a busy server; a wrong-content file is a refusal.
 */
import { expect, test, type Page, type Route } from '@playwright/test';
import { call } from './support/api';
import { readSeed } from './support/seed';
import { PNG, useSession } from './support/ui';

const s = readSeed();
const token = () => s.sessions.owner.tokens.accessToken;
const NETWORK = 'Could not reach the server. Check your connection and try again.';
const SERVER = 'Something went wrong on our side. Please try again in a moment.';
const CANCELLED = 'Upload cancelled. Nothing was saved.';

const isUpload = (route: Route) => route.request().method() === 'POST' && /\/files\/[^/]+\/versions$/.test(new URL(route.request().url()).pathname);

async function newAsset(label: string, project: string): Promise<{ id: string; name: string }> {
  const name = `E2E-c06-${label}-${project}-${s.run}.png`;
  const r = await call<{ id: string }>('/files', { method: 'POST', token: token(), body: { name, projectId: s.project.id, visibility: 'CLIENT_VISIBLE' } });
  expect(r.status).toBe(201);
  return { id: r.body.id, name };
}

async function versions(id: string): Promise<number[]> {
  const r = await call<{ versionNumber: number }[]>(`/files/${id}/versions`, { token: token() });
  expect(r.status).toBe(200);
  return r.body.map((v) => v.versionNumber).sort();
}

async function openUploader(page: Page, asset: { id: string; name: string }) {
  await useSession(page, s.sessions.owner, `/files/${asset.id}`);
  await expect(page.getByRole('heading', { name: asset.name })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Upload a new version' })).toBeVisible();
}

const choosePng = (page: Page, name: string) => page.getByLabel('Choose a file to upload').setInputFiles({ name, mimeType: 'image/png', buffer: PNG });
const upload = (page: Page) => page.getByRole('button', { name: 'Upload', exact: true });
const tryAgain = (page: Page) => page.getByRole('button', { name: 'Try again' });
// The uploader's own alert (Next's route announcer is a second role=alert on every page).
const uploaderAlert = (page: Page) => page.getByRole('region', { name: 'Upload a new version' }).getByRole('alert');

test.describe('C06 upload', () => {
  test('shows progress and locks the controls while sending; Cancel stops it and nothing is saved; Upload then succeeds', async ({ page }, info) => {
    const asset = await newAsset('cancel', info.project.name);
    await openUploader(page, asset);

    let release: () => void = () => undefined;
    const held = new Promise<void>((r) => { release = r; });
    await page.route('**/*', async (route) => {
      if (!isUpload(route)) return route.continue();
      await held;
      // Cancel already tore the request down in the browser; nothing left to abort then.
      await route.abort('aborted').catch(() => undefined);
    });

    await choosePng(page, asset.name);
    await expect(page.getByTestId('chosen-file')).toContainText(asset.name);
    await upload(page).click();

    // Running: progress with a value, a status line, Cancel offered, everything else locked.
    const bar = page.getByRole('progressbar', { name: 'Upload progress' });
    await expect(bar).toBeVisible();
    const value = Number(await bar.getAttribute('aria-valuenow'));
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
    await expect(page.getByRole('status').filter({ hasText: /Sending… \d+%|Sent\. Saving on the server…/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(upload(page)).toHaveCount(0);
    await expect(page.getByLabel('Choose a file to upload')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Add link' })).toBeDisabled();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('status').filter({ hasText: CANCELLED })).toBeVisible();
    await expect(bar).toHaveCount(0);
    await expect(upload(page)).toBeEnabled();
    await expect(page.getByTestId('chosen-file')).toContainText(asset.name);
    release();
    await page.unroute('**/*');
    expect(await versions(asset.id)).toEqual([]);

    // The same chosen file goes through with one tap.
    await upload(page).click();
    await expect(page.getByText('Uploaded as version 1.')).toBeVisible();
    expect(await versions(asset.id)).toEqual([1]);
  });

  test('a lost connection is explained and Try again sends the same file once', async ({ page }, info) => {
    const asset = await newAsset('network', info.project.name);
    await openUploader(page, asset);
    let dropped = 0;
    await page.route('**/*', async (route) => {
      if (!isUpload(route) || dropped > 0) return route.continue();
      dropped++;
      await route.abort('failed');
    });

    await choosePng(page, asset.name);
    await upload(page).click();
    await expect(uploaderAlert(page)).toHaveText(NETWORK);
    await expect(tryAgain(page)).toBeVisible();
    expect(await versions(asset.id)).toEqual([]);

    await tryAgain(page).click();
    await expect(page.getByText('Uploaded as version 1.')).toBeVisible();
    await expect(tryAgain(page)).toHaveCount(0);
    expect(dropped).toBe(1);
    expect(await versions(asset.id)).toEqual([1]);
  });

  test('a response lost after the server stored the file does not become a duplicate on Try again', async ({ page }, info) => {
    const asset = await newAsset('lost-reply', info.project.name);
    await openUploader(page, asset);
    let swallowed = 0;
    await page.route('**/*', async (route) => {
      if (!isUpload(route) || swallowed > 0) return route.continue();
      swallowed++;
      // The request reaches the API and the version is stored; the browser never hears back.
      const reply = await route.fetch();
      expect(reply.status()).toBe(201);
      await route.abort('failed');
    });

    await choosePng(page, asset.name);
    await upload(page).click();
    await expect(uploaderAlert(page)).toHaveText(NETWORK);
    expect(await versions(asset.id)).toEqual([1]);

    await tryAgain(page).click();
    await expect(page.getByText('Your file did arrive as version 1. Nothing was sent twice.')).toBeVisible();
    expect(await versions(asset.id)).toEqual([1]);
    expect(swallowed).toBe(1);
  });

  test('a busy server is retryable; a refused file is not', async ({ page }, info) => {
    const asset = await newAsset('refusals', info.project.name);
    await openUploader(page, asset);
    let busy = 0;
    await page.route('**/*', async (route) => {
      if (!isUpload(route) || busy > 0) return route.continue();
      busy++;
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ statusCode: 503, message: 'Service Unavailable' }) });
    });

    await choosePng(page, asset.name);
    await upload(page).click();
    await expect(uploaderAlert(page)).toHaveText(SERVER);
    await expect(tryAgain(page)).toBeVisible();
    expect(await versions(asset.id)).toEqual([]);
    await tryAgain(page).click();
    await expect(page.getByText('Uploaded as version 1.')).toBeVisible();
    expect(await versions(asset.id)).toEqual([1]);

    // Wrong bytes for the extension: the server refuses, the page says so in one sentence and offers no retry.
    await page.getByLabel('Choose a file to upload').setInputFiles({ name: 'not-a-video.mp4', mimeType: 'video/mp4', buffer: Buffer.from('this is not a video') });
    await upload(page).click();
    await expect(uploaderAlert(page)).toHaveText('File content does not match the .mp4 format. Choose another file.');
    await expect(tryAgain(page)).toHaveCount(0);
    await expect(upload(page)).toBeEnabled();
    expect(await versions(asset.id)).toEqual([1]);

    // Choosing another file clears the refusal and uploads normally.
    await choosePng(page, asset.name);
    await expect(uploaderAlert(page)).toHaveCount(0);
    await upload(page).click();
    await expect(page.getByText('Uploaded as version 2.')).toBeVisible();
    expect(await versions(asset.id)).toEqual([1, 2]);
  });
});
