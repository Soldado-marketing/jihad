/**
 * C06 — upload state machine, error classification and the duplicate guard.
 * Pure logic behind components/files/file-uploader.tsx.
 * Run: node --test test/upload-state.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CANCELLED_MESSAGE,
  classifyUploadError,
  describeUpload,
  findArrivedVersion,
  formatFileSize,
  INITIAL_UPLOAD_STATE,
  isUploading,
  UploadCancelledError,
  UploadFailedError,
  UploadNetworkError,
  uploadReducer,
} from '../src/lib/upload-state.ts';
import { NETWORK_MESSAGE, SESSION_EXPIRED_MESSAGE, isPlainMessage } from '../src/lib/api-errors.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const file = { name: 'clip.mp4', size: 22_541 };
const run = (...events) => events.reduce(uploadReducer, INITIAL_UPLOAD_STATE);

describe('C06 — upload phases', () => {
  it('goes idle → sending (progress) → saving → done, and shows the version', () => {
    let s = run({ type: 'choose', file }, { type: 'start', at: 1_000 });
    assert.equal(s.phase, 'sending'); assert.equal(s.percent, 0); assert.equal(s.startedAt, 1_000); assert.ok(isUploading(s));
    s = uploadReducer(s, { type: 'progress', percent: 42 });
    assert.equal(s.percent, 42); assert.equal(describeUpload(s), 'Sending… 42%');
    s = uploadReducer(s, { type: 'progress', percent: 250 });
    assert.equal(s.percent, 100, 'clamped');
    s = uploadReducer(s, { type: 'sent' });
    assert.equal(s.phase, 'saving'); assert.equal(s.percent, 100); assert.equal(describeUpload(s), 'Sent. Saving on the server…');
    assert.equal(uploadReducer(s, { type: 'progress', percent: 10 }).percent, 100, 'no progress after the body is sent');
    s = uploadReducer(s, { type: 'succeed', versionNumber: 3 });
    assert.equal(s.phase, 'done'); assert.equal(s.message, 'Uploaded as version 3.'); assert.equal(s.file, null); assert.ok(!isUploading(s));
    assert.equal(describeUpload(s), '');
  });

  it('cancel keeps the chosen file so one tap sends it again', () => {
    const s = run({ type: 'choose', file }, { type: 'start', at: 1 }, { type: 'progress', percent: 30 }, { type: 'cancel' });
    assert.equal(s.phase, 'cancelled'); assert.deepEqual(s.file, file); assert.equal(s.message, CANCELLED_MESSAGE); assert.equal(s.retryable, false);
    const again = uploadReducer(s, { type: 'start', at: 2 });
    assert.equal(again.phase, 'sending'); assert.equal(again.message, null);
  });

  it('a lost connection or a busy server is retryable; a refusal is not', () => {
    const net = run({ type: 'choose', file }, { type: 'start', at: 1 }, { type: 'fail', failure: 'network', message: NETWORK_MESSAGE });
    assert.equal(net.phase, 'failed'); assert.equal(net.retryable, true); assert.deepEqual(net.file, file);
    const srv = run({ type: 'choose', file }, { type: 'start', at: 1 }, { type: 'fail', failure: 'server', message: 'x' });
    assert.equal(srv.retryable, true);
    const rej = run({ type: 'choose', file }, { type: 'start', at: 1 }, { type: 'fail', failure: 'rejected', message: 'File content does not match the mp4 format.' });
    assert.equal(rej.retryable, false); assert.deepEqual(rej.file, file, 'the person can still see what was refused');
  });

  it('ignores events that do not fit the phase (no double submit, no stray progress)', () => {
    const idle = INITIAL_UPLOAD_STATE;
    assert.equal(uploadReducer(idle, { type: 'start', at: 1 }), idle, 'nothing chosen');
    assert.equal(uploadReducer(idle, { type: 'progress', percent: 5 }), idle);
    assert.equal(uploadReducer(idle, { type: 'cancel' }), idle);
    assert.equal(uploadReducer(idle, { type: 'fail', failure: 'network', message: 'x' }), idle);
    const sending = run({ type: 'choose', file }, { type: 'start', at: 1 });
    assert.equal(uploadReducer(sending, { type: 'start', at: 2 }), sending, 'a second start while sending is ignored');
    assert.equal(uploadReducer(sending, { type: 'choose', file: { name: 'b', size: 1 } }), sending, 'no new choice mid-flight');
    const chosen = uploadReducer(run({ type: 'choose', file }, { type: 'start', at: 1 }, { type: 'cancel' }), { type: 'choose', file: null });
    assert.equal(chosen.file, null); assert.equal(chosen.message, null, 'choosing clears the previous outcome');
  });
});

describe('C06 — error classification', () => {
  it('sorts transport errors into cancelled / network / server / rejected / session', () => {
    assert.deepEqual(classifyUploadError(new UploadCancelledError()), { kind: 'cancelled', message: CANCELLED_MESSAGE });
    assert.deepEqual(classifyUploadError(new UploadNetworkError(NETWORK_MESSAGE)), { kind: 'network', message: NETWORK_MESSAGE });
    assert.equal(classifyUploadError(new UploadFailedError(503, 'Something went wrong on our side. Please try again in a moment.')).kind, 'server');
    assert.equal(classifyUploadError(new UploadFailedError(429, 'Too many attempts. Please wait a moment and try again.')).kind, 'server');
    assert.equal(classifyUploadError(new UploadFailedError(400, 'File content does not match the mp4 format.')).kind, 'rejected');
    assert.equal(classifyUploadError(new UploadFailedError(413, 'That file is too large.')).kind, 'rejected');
    assert.equal(classifyUploadError(new UploadFailedError(401, SESSION_EXPIRED_MESSAGE)).kind, 'session');
    assert.deepEqual(classifyUploadError(new Error('odd')), { kind: 'rejected', message: 'odd' }, 'unknown errors never start a retry');
    assert.deepEqual(classifyUploadError(undefined), { kind: 'rejected', message: 'Upload failed.' });
  });

  it('every sentence the uploader can show is plain', () => {
    for (const text of [CANCELLED_MESSAGE, NETWORK_MESSAGE, 'Uploaded as version 3.', 'Your file did arrive as version 2. Nothing was sent twice.']) {
      assert.ok(isPlainMessage(text), text);
    }
  });
});

describe('C06 — duplicate guard before a retry', () => {
  const versions = [
    { versionNumber: 1, originalName: 'clip.mp4', sizeBytes: 22_541, createdAt: '2026-11-05T10:00:00.000Z' },
    { versionNumber: 2, originalName: 'other.png', sizeBytes: 22_541, createdAt: '2026-11-05T12:00:00.000Z' },
    { versionNumber: 3, originalName: 'clip.mp4', sizeBytes: 22_540, createdAt: '2026-11-05T12:00:00.000Z' },
  ];
  const noon = Date.parse('2026-11-05T12:00:00.000Z');

  it('finds only a version with the same name and size created after the attempt began', () => {
    assert.equal(findArrivedVersion(versions, file, noon), null, 'older, other name or other size do not count');
    const arrived = { versionNumber: 4, originalName: 'clip.mp4', sizeBytes: 22_541, createdAt: '2026-11-05T12:00:03.000Z' };
    assert.equal(findArrivedVersion([...versions, arrived], file, noon), arrived);
    assert.equal(findArrivedVersion([...versions, arrived], file, noon + 10_000), null, 'created before this attempt (beyond the clock allowance)');
    assert.equal(findArrivedVersion([...versions, { ...arrived, createdAt: '2026-11-05T11:59:57.000Z' }], file, noon)?.versionNumber, 4, '5 s clock allowance');
    const two = [...versions, arrived, { ...arrived, versionNumber: 5, createdAt: '2026-11-05T12:00:09.000Z' }];
    assert.equal(findArrivedVersion(two, file, noon)?.versionNumber, 5, 'the newest match');
    assert.equal(findArrivedVersion([{ versionNumber: 9, originalName: 'clip.mp4', sizeBytes: 22_541 }], file, noon), null, 'no createdAt → no claim');
  });
});

describe('C06 — wiring', () => {
  it('apiUpload exposes cancel and the sent phase; the uploader uses them and the guard', () => {
    const fetchSrc = read('src/lib/fetch.ts');
    assert.match(fetchSrc, /signal\?: AbortSignal/);
    assert.match(fetchSrc, /xhr\.abort\(\)/);
    assert.match(fetchSrc, /xhr\.upload\.onload = \(\) => \{/);
    assert.match(fetchSrc, /new UploadFailedError\(status, apiErrorMessage\(status, parsed\)\)/);
    const ui = read('src/components/files/file-uploader.tsx');
    assert.match(ui, /signal: controller\.signal/);
    assert.match(ui, /findArrivedVersion\(/);
    assert.match(ui, /role="progressbar"/);
    assert.match(ui, /role="status"/);
    assert.match(ui, /role="alert"/);
    assert.match(ui, />\s*Cancel\s*</);
    assert.match(ui, />\s*Try again\s*</);
    assert.match(ui, /min-h-11/, 'touch targets');
    assert.doesNotMatch(ui, /storageKey|signedUrl|presigned/i);
  });

  it('formats the chosen file size for people', () => {
    assert.equal(formatFileSize(512), '512 B');
    assert.equal(formatFileSize(22_541), '22.0 KB');
    assert.equal(formatFileSize(26_214_400), '25.0 MB');
    assert.equal(formatFileSize(-1), '');
  });
});
