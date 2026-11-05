/**
 * C05 - Video playback and download verification (MP4/MOV, large files).
 *
 * Proves, over real HTTP against the real app, an isolated database and an
 * in-memory S3-compatible store (test/support/s3-stub.mjs):
 *   - a real MP4 of exactly 25 MiB uploads at the default limit, 100 MiB at
 *     FILE_MAX_UPLOAD_BYTES=100 MiB, one byte more is refused, a fake .mp4 is refused;
 *   - staff downloads are byte-identical; the client copy keeps the length and
 *     the media data and blanks the metadata boxes;
 *   - HTTP range requests are honoured on both content routes (206 /
 *     Content-Range / 416), without weakening any authorisation check;
 *   - the API does not hold several copies of a 100 MiB video in memory while
 *     a client downloads it.
 * Run with MAOS_INTEGRATION=1, DATABASE_URL and JWT_SECRET, after migrations.
 * Requires a TEST database only; never point this suite at production.
 */
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { before, after, describe, it } from 'node:test';
import { createS3Stub } from './support/s3-stub.mjs';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const skip = process.env.MAOS_INTEGRATION !== '1' || !existsSync(join(apiRoot, 'dist/app.module.js'));
const RUN = 'c05' + Date.now().toString(36);
const PASSWORD = 'VideoLargeFilesTest123!';
const MiB = 1024 * 1024;
const HARD_LIMIT = 100 * MiB;

let app, base, request, prisma, stub;
const co = {};
const p = {};
const rec = {};

// ── Synthetic, structurally valid MP4/MOV of an exact size ───────────────────
// ftyp + moov(mvhd, udta(©ART <staff name>)) + mdat(padding). The media data is
// a repeating random block, so a byte-for-byte comparison is meaningful.
const box = (type, ...parts) => { const body = Buffer.concat(parts); const h = Buffer.alloc(8); h.writeUInt32BE(body.length + 8, 0); h.write(type, 4, 'latin1'); return Buffer.concat([h, body]); };
const STAFF_NAME = `Camera Operator ${RUN}`;
const PATTERN = randomBytes(64 * 1024);
function video(totalBytes, brand = 'isom') {
  const ftyp = box('ftyp', Buffer.from(`${brand}\0\0\x02\0${brand}iso2`, 'latin1'));
  const udta = box('udta', box('\xa9ART', Buffer.from(STAFF_NAME, 'latin1')));
  const moov = box('moov', box('mvhd', Buffer.alloc(20)), udta);
  const head = Buffer.concat([ftyp, moov]);
  const mdatBody = totalBytes - head.length - 8;
  assert.ok(mdatBody > 0);
  const mdat = Buffer.alloc(mdatBody + 8);
  mdat.writeUInt32BE(mdatBody + 8, 0); mdat.write('mdat', 4, 'latin1');
  for (let i = 8; i < mdat.length; i += PATTERN.length) PATTERN.copy(mdat, i, 0, Math.min(PATTERN.length, mdat.length - i));
  const file = Buffer.concat([head, mdat]);
  assert.equal(file.length, totalBytes);
  const udtaOffset = ftyp.length + 8 + 8 + 20; // inside moov, after mvhd
  return { file, udtaOffset, udtaSize: udta.length, mdatOffset: head.length };
}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// ── Helpers ──────────────────────────────────────────────────────────────────
async function member(tenant, role, label, extra = {}) {
  const bcrypt = require('bcrypt');
  const user = await prisma.user.create({
    data: { email: `${label}-${RUN}@example.test`, displayName: `${label} Person ${RUN}`, passwordHash: await bcrypt.hash(PASSWORD, 10), status: 'APPROVED' },
  });
  await prisma.tenantMembership.create({ data: { tenantId: tenant.id, userId: user.id, role, status: 'ACTIVE', ...extra } });
  return { id: user.id, email: user.email, name: user.displayName };
}
let ip = 0;
async function login(person, tenant) {
  const res = await request(app.getHttpServer()).post('/api/auth/login').set('X-Forwarded-For', `198.51.100.${++ip}`).send({ email: person.email, passwordOrMagicCode: PASSWORD, tenantSlug: tenant.slug });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.tokens.accessToken;
}
const json = (token, method, path, body) => {
  let req = request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`);
  return body ? req.send(body) : req;
};
/** Multipart upload of one buffer; returns the supertest response. */
const upload = (token, fileAssetId, buffer, filename, type = 'video/mp4') =>
  request(app.getHttpServer()).post(`/api/files/${fileAssetId}/versions`).set('Authorization', `Bearer ${token}`).attach('file', buffer, { filename, contentType: type });

/**
 * Raw GET of a content route with fetch: headers are read as sent, the body is
 * consumed as a stream (hashed, sliced by caller) so a 100 MiB response is never
 * held whole in this process.
 */
async function get(path, { token, range } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (range) headers.range = range;
  const res = await fetch(`${base}${path}`, { headers });
  const hash = createHash('sha256');
  let length = 0;
  const head = []; let headLen = 0;
  const HEAD_KEEP = 4 * MiB; // first bytes kept for structural assertions
  if (res.body) {
    for await (const chunk of res.body) {
      const b = Buffer.from(chunk);
      hash.update(b); length += b.length;
      if (headLen < HEAD_KEEP) { head.push(b.subarray(0, HEAD_KEEP - headLen)); headLen += Math.min(b.length, HEAD_KEEP - headLen); }
    }
  }
  return { status: res.status, headers: res.headers, length, sha256: hash.digest('hex'), head: Buffer.concat(head) };
}

/** Peak of process.memoryUsage()[field] while `work` runs, minus the value before it. */
async function peakGrowth(field, work) {
  const before = process.memoryUsage()[field];
  let peak = before;
  const timer = setInterval(() => { peak = Math.max(peak, process.memoryUsage()[field]); }, 5);
  try { await work(); } finally { clearInterval(timer); }
  peak = Math.max(peak, process.memoryUsage()[field]);
  return peak - before;
}

const audits = (fileAssetId) => prisma.auditEvent.count({ where: { tenantId: co.a.id, action: 'file.version.download', resourceId: fileAssetId } });

before(async () => {
  if (skip) return;
  stub = createS3Stub();
  const port = await stub.listen(0);
  process.env.S3_BUCKET = 'c05-test-bucket';
  process.env.S3_REGION = 'eu-central-1';
  process.env.S3_ACCESS_KEY_ID = 'c05-test-only';
  process.env.S3_SECRET_ACCESS_KEY = 'c05-test-only-not-a-secret';
  process.env.S3_ENDPOINT = `http://127.0.0.1:${port}`;
  process.env.S3_KEY_PREFIX = '';
  process.env.S3_FORCE_PATH_STYLE = 'true';
  delete process.env.FILE_MAX_UPLOAD_BYTES; // default 25 MiB; raised per case below (read at request time)

  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require(join(apiRoot, 'dist/app.module.js'));
  const { AllExceptionsFilter } = require(join(apiRoot, 'dist/common/http/all-exceptions.filter.js'));
  app = await NestFactory.create(AppModule, { logger: false });
  require(join(apiRoot, 'dist/common/http/trust-proxy.js')).configureTrustProxy(app, {});
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
  await app.init();
  await app.listen(0, '127.0.0.1');
  base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  request = require('supertest');
  const { PrismaService } = require(join(apiRoot, 'dist/modules/prisma/prisma.service.js'));
  prisma = app.get(PrismaService);

  co.a = await prisma.tenant.create({ data: { name: `Studio A ${RUN}`, slug: `${RUN}-a`, status: 'ACTIVE' } });
  co.b = await prisma.tenant.create({ data: { name: `Studio B ${RUN}`, slug: `${RUN}-b`, status: 'ACTIVE' } });
  p.owner = await member(co.a, 'OWNER', 'owner');
  p.employee = await member(co.a, 'EMPLOYEE', 'employee');
  p.clientX = await member(co.a, 'CLIENT', 'clientx', { clientScopeKey: `x-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });
  p.clientY = await member(co.a, 'CLIENT', 'clienty', { clientScopeKey: `y-${RUN}`, visibilityScope: 'CLIENT_LEVEL' });
  p.ownerB = await member(co.b, 'OWNER', 'ownerb');
  const custX = await prisma.customer.create({ data: { tenantId: co.a.id, name: `Customer X ${RUN}`, clientScopeKey: `x-${RUN}` } });
  rec.projX = await prisma.project.create({ data: { tenantId: co.a.id, name: `Project X ${RUN}`, status: 'ACTIVE', customerId: custX.id, clientScopeKey: `x-${RUN}`, clientVisible: true } });
  for (const k of ['owner', 'employee', 'clientX', 'clientY']) p[k + 'Token'] = await login(p[k], co.a);
  p.ownerBToken = await login(p.ownerB, co.b);
});
after(async () => { if (app) await app.close(); if (stub) await stub.close(); });

/** Creates a client-visible asset in project X and uploads `buffer` as version 1. */
async function uploaded(label, buffer, filename, type) {
  const asset = await json(p.ownerToken, 'post', '/api/files', { name: `${label} ${RUN}`, projectId: rec.projX.id, visibility: 'CLIENT_VISIBLE' });
  assert.equal(asset.status, 201, JSON.stringify(asset.body));
  const v = await upload(p.ownerToken, asset.body.id, buffer, filename, type);
  assert.equal(v.status, 201, JSON.stringify(v.body).slice(0, 300));
  const versionId = v.body.id ?? v.body.version?.id;
  assert.ok(versionId);
  return { assetId: asset.body.id, versionId, name: `${label} ${RUN}` };
}
const staffPath = (f, q = '') => `/api/files/${f.assetId}/versions/${f.versionId}/content${q}`;
const clientPath = (f, q = '') => `/api/client/files/${f.assetId}/versions/${f.versionId}/content${q}`;

const small = video(25 * MiB);
const big = video(100 * MiB);

describe('C05 - upload limits for video', { skip }, () => {
  it('25 MiB real MP4 is accepted at the default limit; one byte more is refused with a clear message', async () => {
    rec.small = await uploaded('Teaser 25', small.file, 'teaser-25.mp4');
    const meta = await json(p.ownerToken, 'get', `/api/files/${rec.small.assetId}/versions/${rec.small.versionId}`);
    assert.equal(meta.status, 200);
    assert.equal(meta.body.sizeBytes, 25 * MiB);
    assert.ok(!('storageKey' in meta.body));
    const asset = await json(p.ownerToken, 'get', `/api/files/${rec.small.assetId}`);
    assert.equal(asset.body.mimeType, 'video/mp4');

    const over = video(25 * MiB + 1);
    const refused = await upload(p.ownerToken, rec.small.assetId, over.file, 'too-big.mp4');
    assert.equal(refused.status, 400, JSON.stringify(refused.body));
    assert.equal(refused.body.code ?? refused.body.error?.code, 'FILE_TOO_LARGE');
    assert.match(JSON.stringify(refused.body), /maximum size of 26214400 bytes/);
  });

  it('a fake .mp4 (wrong bytes) is still refused; MOV is accepted as video/quicktime', async () => {
    const fake = await upload(p.ownerToken, rec.small.assetId, randomBytes(4096), 'fake.mp4');
    assert.equal(fake.status, 400);
    assert.equal(fake.body.code ?? fake.body.error?.code, 'UNSUPPORTED_FILE_TYPE');
    rec.mov = await uploaded('Clip MOV', video(2 * MiB, 'qt  ').file, 'clip.mov', 'video/quicktime');
    const asset = await json(p.ownerToken, 'get', `/api/files/${rec.mov.assetId}`);
    assert.equal(asset.body.mimeType, 'video/quicktime');
  });

  it('100 MiB real MP4 is accepted when FILE_MAX_UPLOAD_BYTES is 100 MiB; 100 MiB + 1 byte is refused at the hard ceiling', async (t) => {
    process.env.FILE_MAX_UPLOAD_BYTES = String(HARD_LIMIT);
    const started = Date.now();
    const growth = await peakGrowth('rss', async () => { rec.big = await uploaded('Showreel 100', big.file, 'showreel-100.mp4'); });
    t.diagnostic(`upload 100 MiB: ${Date.now() - started} ms, process RSS growth during upload ${(growth / MiB).toFixed(0)} MiB (test process hosts API + store)`);
    const meta = await json(p.ownerToken, 'get', `/api/files/${rec.big.assetId}/versions/${rec.big.versionId}`);
    assert.equal(meta.body.sizeBytes, 100 * MiB);

    const over = Buffer.concat([big.file, Buffer.alloc(1)]);
    over.writeUInt32BE(big.file.length - big.mdatOffset + 1, big.mdatOffset);
    const refused = await upload(p.ownerToken, rec.big.assetId, over, 'over-ceiling.mp4');
    assert.equal(refused.status, 413, JSON.stringify(refused.body).slice(0, 200));
  });
});

describe('C05 - staff download and range requests', { skip }, () => {
  const expectCommon = (r, type = 'video/mp4') => {
    assert.equal(r.headers.get('content-type'), type);
    assert.equal(r.headers.get('accept-ranges'), 'bytes', 'the browser must learn that ranges work');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('cache-control'), 'private, no-store');
  };

  it('full download is byte-identical, named after the original, with the right length (25 and 100 MiB)', async (t) => {
    const r25 = await get(staffPath(rec.small, '?disposition=attachment'), { token: p.ownerToken });
    assert.equal(r25.status, 200);
    expectCommon(r25);
    assert.equal(r25.headers.get('content-disposition'), 'attachment; filename="teaser-25.mp4"');
    assert.equal(r25.headers.get('content-length'), String(25 * MiB));
    assert.equal(r25.length, 25 * MiB);
    assert.equal(r25.sha256, sha256(small.file));

    const started = Date.now();
    const r100 = await get(staffPath(rec.big), { token: p.ownerToken });
    t.diagnostic(`staff download 100 MiB: ${Date.now() - started} ms`);
    assert.equal(r100.status, 200);
    assert.equal(r100.length, 100 * MiB);
    assert.equal(r100.sha256, sha256(big.file));

    const inline = await get(staffPath(rec.small, '?disposition=inline'), { token: p.ownerToken });
    assert.equal(inline.headers.get('content-disposition'), 'inline; filename="teaser-25.mp4"', 'video is inline-safe');
    const mov = await get(staffPath(rec.mov), { token: p.ownerToken });
    expectCommon(mov, 'video/quicktime');
  });

  it('a single byte range answers 206 with Content-Range and exactly those bytes', async () => {
    const N = 25 * MiB;
    const probe = await get(staffPath(rec.small), { token: p.ownerToken, range: 'bytes=0-1' });
    assert.equal(probe.status, 206, 'Safari probes with bytes=0-1 before it plays anything');
    expectCommon(probe);
    assert.equal(probe.headers.get('content-range'), `bytes 0-1/${N}`);
    assert.equal(probe.headers.get('content-length'), '2');
    assert.equal(probe.length, 2);
    assert.deepEqual(probe.head, small.file.subarray(0, 2));
    assert.equal(probe.headers.get('content-disposition'), 'attachment; filename="teaser-25.mp4"');

    const mid = await get(staffPath(rec.small), { token: p.ownerToken, range: 'bytes=1000-1999' });
    assert.equal(mid.status, 206);
    assert.equal(mid.headers.get('content-range'), `bytes 1000-1999/${N}`);
    assert.deepEqual(mid.head, small.file.subarray(1000, 2000));

    const open = await get(staffPath(rec.small), { token: p.ownerToken, range: `bytes=${N - 100}-` });
    assert.equal(open.status, 206);
    assert.equal(open.headers.get('content-range'), `bytes ${N - 100}-${N - 1}/${N}`);
    assert.deepEqual(open.head, small.file.subarray(N - 100));

    const suffix = await get(staffPath(rec.small), { token: p.ownerToken, range: 'bytes=-100' });
    assert.equal(suffix.status, 206);
    assert.equal(suffix.headers.get('content-range'), `bytes ${N - 100}-${N - 1}/${N}`);

    const whole = await get(staffPath(rec.small), { token: p.ownerToken, range: 'bytes=0-' });
    assert.equal(whole.status, 206);
    assert.equal(whole.headers.get('content-range'), `bytes 0-${N - 1}/${N}`);
    assert.equal(whole.sha256, sha256(small.file));

    const clamped = await get(staffPath(rec.small), { token: p.ownerToken, range: `bytes=${N - 10}-${N + 500}` });
    assert.equal(clamped.status, 206, 'an end past the file is clamped, not refused');
    assert.equal(clamped.headers.get('content-range'), `bytes ${N - 10}-${N - 1}/${N}`);

    const seek = await get(staffPath(rec.big), { token: p.ownerToken, range: `bytes=${90 * MiB}-${90 * MiB + 65535}` });
    assert.equal(seek.status, 206, 'seeking late in a 100 MiB video reads only that window');
    assert.equal(seek.length, 65536);
    assert.deepEqual(seek.head, big.file.subarray(90 * MiB, 90 * MiB + 65536));
  });

  it('unsatisfiable ranges answer 416 with the size; multi-range and malformed headers fall back to the full 200', async () => {
    const N = 25 * MiB;
    const past = await get(staffPath(rec.small), { token: p.ownerToken, range: `bytes=${N}-` });
    assert.equal(past.status, 416);
    assert.equal(past.headers.get('content-range'), `bytes */${N}`);
    assert.equal(past.length, 0);
    const zero = await get(staffPath(rec.small), { token: p.ownerToken, range: 'bytes=-0' });
    assert.equal(zero.status, 416);

    for (const range of ['bytes=0-1,5-6', 'bytes=5-2', 'bytes=abc', 'items=0-1', 'bytes=']) {
      const r = await get(staffPath(rec.small), { token: p.ownerToken, range });
      assert.equal(r.status, 200, `${range} is served whole`);
      assert.equal(r.length, N);
      assert.equal(r.headers.get('accept-ranges'), 'bytes');
    }
    const bigSuffix = await get(staffPath(rec.small), { token: p.ownerToken, range: `bytes=-${N + 5}` });
    assert.equal(bigSuffix.status, 206, 'a suffix longer than the file means the whole file');
    assert.equal(bigSuffix.headers.get('content-range'), `bytes 0-${N - 1}/${N}`);
  });
});

describe('C05 - client delivery: prepared copy, ranges and memory', { skip }, () => {
  before(async () => {
    if (skip) return;
    for (const f of [rec.small, rec.big]) {
      const d = await json(p.ownerToken, 'post', '/api/deliveries', { fileAssetId: f.assetId, fileVersionId: f.versionId, message: 'Please review.' });
      assert.equal(d.status, 201, JSON.stringify(d.body));
      f.deliveryId = d.body.id;
    }
  });

  /** The expected client copy: metadata box renamed to 'free' and blanked, everything else untouched. */
  const clientCopyHead = (v, keep) => {
    const out = Buffer.from(v.file.subarray(0, keep));
    out.write('free', v.udtaOffset + 4, 'latin1');
    out.fill(0, v.udtaOffset + 8, v.udtaOffset + v.udtaSize);
    return out;
  };

  it('the client copy keeps length and media data, blanks the metadata box, carries a neutral name (25 MiB)', async () => {
    const r = await get(clientPath(rec.small, '?disposition=attachment'), { token: p.clientXToken });
    assert.equal(r.status, 200, r.status);
    assert.equal(r.headers.get('content-type'), 'video/mp4');
    assert.equal(r.headers.get('accept-ranges'), 'bytes');
    assert.equal(r.headers.get('content-length'), String(25 * MiB));
    assert.equal(r.length, 25 * MiB);
    assert.match(r.headers.get('content-disposition'), /^attachment; filename="[^"]*\.mp4"$/);
    assert.ok(!r.headers.get('content-disposition').includes('teaser-25'), 'the uploaded name never reaches the client');
    assert.notEqual(r.sha256, sha256(small.file), 'the metadata box was blanked');
    assert.deepEqual(r.head.subarray(0, small.mdatOffset + 64), clientCopyHead(small, small.mdatOffset + 64));
    assert.ok(!r.head.includes(STAFF_NAME, 0, 'latin1'));
    // Media data identical: hash of the whole copy equals the hash of the expected copy.
    const expected = createHash('sha256').update(clientCopyHead(small, small.mdatOffset)).update(small.file.subarray(small.mdatOffset)).digest('hex');
    assert.equal(r.sha256, expected);
  });

  it('range requests on the client route are served from the prepared copy', async () => {
    const N = 25 * MiB; const v = small;
    const probe = await get(clientPath(rec.small), { token: p.clientXToken, range: 'bytes=0-1' });
    assert.equal(probe.status, 206);
    assert.equal(probe.headers.get('content-range'), `bytes 0-1/${N}`);
    assert.equal(probe.length, 2);
    const meta = await get(clientPath(rec.small), { token: p.clientXToken, range: `bytes=${v.udtaOffset}-${v.udtaOffset + v.udtaSize - 1}` });
    assert.equal(meta.status, 206);
    assert.equal(meta.length, v.udtaSize);
    assert.deepEqual(meta.head, clientCopyHead(v, v.udtaOffset + v.udtaSize).subarray(v.udtaOffset), 'the slice is blanked exactly like the full copy');
    assert.ok(!meta.head.includes(STAFF_NAME, 0, 'latin1'));
    const tail = await get(clientPath(rec.small), { token: p.clientXToken, range: 'bytes=-4096' });
    assert.equal(tail.status, 206);
    assert.equal(tail.headers.get('content-range'), `bytes ${N - 4096}-${N - 1}/${N}`);
    assert.deepEqual(tail.head, v.file.subarray(N - 4096));
    const past = await get(clientPath(rec.small), { token: p.clientXToken, range: `bytes=${N}-${N + 1}` });
    assert.equal(past.status, 416);
    assert.equal(past.headers.get('content-range'), `bytes */${N}`);
  });

  it('a 100 MiB client download is streamed: the process does not hold several copies of the video', async (t) => {
    let r;
    const started = Date.now();
    const growth = await peakGrowth('arrayBuffers', async () => { r = await get(clientPath(rec.big), { token: p.clientXToken }); });
    t.diagnostic(`client download 100 MiB: ${Date.now() - started} ms, peak ArrayBuffer growth ${(growth / MiB).toFixed(0)} MiB`);
    assert.equal(r.status, 200);
    assert.equal(r.length, 100 * MiB);
    const expected = createHash('sha256').update(clientCopyHead(big, big.mdatOffset)).update(big.file.subarray(big.mdatOffset)).digest('hex');
    assert.equal(r.sha256, expected, 'the 100 MiB copy is the original with only the metadata box blanked');
    assert.ok(growth < 48 * MiB, `peak ArrayBuffer growth ${(growth / MiB).toFixed(0)} MiB: the video was buffered, not streamed`);
  });

  it('authorisation is unchanged when a Range header is present; one audit row per request', async () => {
    const range = 'bytes=0-1';
    assert.equal((await get(staffPath(rec.small), { range })).status, 401, 'anonymous');
    assert.equal((await get(staffPath(rec.small), { token: p.ownerBToken, range })).status, 404, 'other company');
    assert.equal((await get(clientPath(rec.small), { token: p.ownerBToken, range })).status, 404, 'other company on the client route');
    assert.equal((await get(clientPath(rec.small), { token: p.clientYToken, range })).status, 403, 'other client');
    assert.equal((await get(clientPath(rec.small), { token: p.employeeToken, range })).status, 403, 'employee on the client route');
    assert.equal((await get(staffPath(rec.small), { token: p.clientXToken, range })).status, 403, 'client on the staff route');

    await prisma.fileVersion.update({ where: { id: rec.mov.versionId }, data: { status: 'QUARANTINED' } });
    assert.equal((await get(staffPath(rec.mov), { token: p.ownerToken, range })).status, 403, 'quarantined version');
    await prisma.fileVersion.update({ where: { id: rec.mov.versionId }, data: { status: 'ACTIVE' } });

    const before = await audits(rec.small.assetId);
    assert.equal((await get(staffPath(rec.small), { token: p.ownerToken, range })).status, 206);
    assert.equal((await get(clientPath(rec.small), { token: p.clientXToken, range: 'bytes=5-9' })).status, 206);
    assert.equal(await audits(rec.small.assetId), before + 2);
  });
});
