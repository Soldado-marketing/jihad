/**
 * C05 - video playback and download in the browser, desktop and mobile.
 *
 * The seed delivered a real 2-second H.264 MP4 (e2e/fixtures/clip-h264.mp4,
 * which carries an encoder `udta` box) to the client. Staff watch it inline on
 * the file page, the client watches the prepared copy on the delivery page;
 * both download it and the saved bytes are checked, not just the click.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { call } from './support/api';
import { readSeed } from './support/seed';
import { useSession } from './support/ui';

const s = readSeed();
const CLIP = readFileSync('e2e/fixtures/clip-h264.mp4');
const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');

/** Waits for the player to have decoded the metadata and to make progress when played (muted: no gesture needed). */
async function expectPlays(page: Page, video: ReturnType<Page['locator']>) {
  await expect(video).toBeVisible();
  const state = await video.evaluate(async (el) => {
    const v = el as HTMLVideoElement;
    v.muted = true;
    if (v.readyState < 1) await new Promise<void>((done, fail) => { v.addEventListener('loadedmetadata', () => done(), { once: true }); v.addEventListener('error', () => fail(new Error(`video error ${v.error?.code}`)), { once: true }); });
    await v.play();
    await new Promise((r) => setTimeout(r, 700));
    v.pause();
    return { duration: v.duration, currentTime: v.currentTime, readyState: v.readyState, width: v.videoWidth, height: v.videoHeight };
  });
  expect(state.duration).toBeGreaterThan(1.5);
  expect(state.duration).toBeLessThan(3);
  expect(state.currentTime).toBeGreaterThan(0.2);
  expect(state.readyState).toBeGreaterThanOrEqual(2);
  expect(state.width).toBe(320);
  expect(state.height).toBe(240);
}

test.describe('C05 video - staff', () => {
  test('plays the delivered video inline on the file page and downloads the original', async ({ page }) => {
    const file = s.files.video;
    await useSession(page, s.sessions.owner, `/files/${file.id}`);
    await expect(page.getByRole('heading', { name: file.name })).toBeVisible();
    // The compare pane loads the version through the authorised content route and plays it in the page.
    await expectPlays(page, page.locator('video').first());

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download' }).first().click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe(file.name);
    const bytes = readFileSync(await saved.path());
    expect(bytes.length).toBe(CLIP.length);
    expect(sha256(bytes)).toBe(sha256(CLIP));
  });

  test('the content route answers a byte-range probe the way a native player needs', async () => {
    const token = s.sessions.owner.tokens.accessToken;
    const probe = await fetch(`${process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/api'}/files/${s.files.video.id}/versions/${s.files.video.versionId}/content`, {
      headers: { authorization: `Bearer ${token}`, range: 'bytes=0-1' },
    });
    expect(probe.status).toBe(206);
    expect(probe.headers.get('content-range')).toBe(`bytes 0-1/${CLIP.length}`);
    expect(probe.headers.get('accept-ranges')).toBe('bytes');
    expect(Buffer.from(await probe.arrayBuffer()).equals(CLIP.subarray(0, 2))).toBe(true);
  });
});

test.describe('C05 video - client', () => {
  test('watches the delivered video in the portal and downloads the prepared copy', async ({ page }) => {
    const file = s.files.video;
    await useSession(page, s.sessions.clientOne, `/client/deliveries/${file.deliveryId}`);
    await expect(page.getByText('Video', { exact: true })).toBeVisible();
    await expectPlays(page, page.locator('video'));

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download' }).click();
    const saved = await download;
    const bytes = readFileSync(await saved.path());
    expect(saved.suggestedFilename()).toMatch(/\.mp4$/);
    expect(saved.suggestedFilename()).not.toContain('deliverable');
    // Same length and media data; only the encoder metadata box is blanked.
    expect(bytes.length).toBe(CLIP.length);
    expect(sha256(bytes)).not.toBe(sha256(CLIP));
    const udta = CLIP.indexOf('udta', 0, 'latin1') - 4;
    expect(udta).toBeGreaterThan(0);
    expect(bytes.toString('latin1', udta + 4, udta + 8)).toBe('free');
    expect(bytes.subarray(0, udta).equals(CLIP.subarray(0, udta))).toBe(true);
    const udtaEnd = udta + CLIP.readUInt32BE(udta);
    expect(bytes.subarray(udtaEnd).equals(CLIP.subarray(udtaEnd))).toBe(true);
    expect(bytes.subarray(udta + 8, udtaEnd).every((b) => b === 0)).toBe(true);
  });

  test('the second client cannot reach the video, with or without a range', async () => {
    const token = s.sessions.clientTwo.tokens.accessToken;
    const path = `/client/files/${s.files.video.id}/versions/${s.files.video.versionId}/content`;
    expect((await call(path, { token })).status).toBe(403);
    expect((await call(`/client/deliveries/${s.files.video.deliveryId}`, { token })).status).toBe(404);
    const ranged = await fetch(`${process.env.E2E_API_URL ?? 'http://127.0.0.1:3001/api'}${path}`, { headers: { authorization: `Bearer ${token}`, range: 'bytes=0-1' } });
    expect(ranged.status).toBe(403);
  });
});
