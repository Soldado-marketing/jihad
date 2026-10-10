/**
 * Email delivery tracking - writer (MAOS-T44).
 * Run: node --test test/email-delivery-tracking.test.mjs
 *
 * Sending an invoice records one EmailMessage per recipient: SENT with the
 * Resend id when the provider accepted it, FAILED without an id when it did
 * not. Tracking is failure-safe: a tracking error never changes the outcome
 * of a send that already happened. Uses a stubbed fetch and repository, like
 * invoice-send-privacy.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);

for (const [src, out] of [
  ['src/modules/mail/mail.service.ts', 'dist/modules/mail/mail.service.js'],
  ['src/modules/invoices/invoices.service.ts', 'dist/modules/invoices/invoices.service.js'],
]) {
  const o = join(apiRoot, out);
  if (!existsSync(o) || statSync(o).mtimeMs < statSync(join(apiRoot, src)).mtimeMs) {
    execFileSync('npm', ['run', 'build'], { cwd: apiRoot, stdio: 'ignore' });
    break;
  }
}

const { MailService } = require(join(apiRoot, 'dist/modules/mail/mail.service.js'));
const { InvoicesService } = require(join(apiRoot, 'dist/modules/invoices/invoices.service.js'));

const CLIENTS = ['anna@client-a.example', 'Ben@Client-A.example', 'cara@client-a.example'];
const realFetch = globalThis.fetch;
const savedKey = process.env.RESEND_API_KEY;
let recorded;
let failIndex;

beforeEach(() => {
  process.env.RESEND_API_KEY = 're_test_delivery_tracking';
  recorded = [];
  failIndex = new Set();
  let n = 0;
  globalThis.fetch = async () => {
    n += 1;
    return failIndex.has(n)
      ? new Response(JSON.stringify({ message: 'rejected' }), { status: 422 })
      : new Response(JSON.stringify({ id: `msg_${n}` }), { status: 200 });
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
  if (savedKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = savedKey;
});

function makeService({ trackingThrows = false } = {}) {
  const mail = new MailService();
  mail.logger = { error() {}, log() {}, warn() {} };
  const invoice = { currency: 'EUR', id: 'inv_1', invoiceNumber: 'INV-1', paidCents: 0, projectId: 'proj_1', clientScopeKey: 'A', status: 'SENT', tenantId: 't_1', totalCents: 12000 };
  const repo = {
    findProjectClientEmails: async () => CLIENTS.map((email) => ({ email })),
    getForPdf: async () => invoice,
    markSent: async () => ({ ...invoice, status: 'SENT' }),
    recordEmailDeliveries: async (...args) => {
      if (trackingThrows) throw new Error('database unavailable');
      recorded.push(args);
    },
  };
  const service = new InvoicesService(repo, {}, mail, { createAuditEvent: async () => undefined }, {});
  service.logger = { error() {}, log() {}, warn() {} };
  service.renderPdf = async () => ({ buffer: Buffer.from('%PDF-1.7 test'), filename: 'invoice-INV-1.pdf' });
  return service;
}

const actor = { actorId: 'u_owner', role: 'OWNER', tenantId: 't_1' };

describe('invoice send - delivery tracking', () => {
  it('records one SENT row per recipient with its provider id', async () => {
    await makeService().send(actor, 'inv_1', {});
    assert.equal(recorded.length, 1);
    const [tenantId, resourceType, resourceId, deliveries] = recorded[0];
    assert.deepEqual([tenantId, resourceType, resourceId], ['t_1', 'Invoice', 'inv_1']);
    assert.deepEqual(deliveries, [
      { recipient: 'anna@client-a.example', accepted: true, providerMessageId: 'msg_1' },
      { recipient: 'Ben@Client-A.example', accepted: true, providerMessageId: 'msg_2' },
      { recipient: 'cara@client-a.example', accepted: true, providerMessageId: 'msg_3' },
    ]);
  });

  it('records the failed recipient of a partial send as not accepted, without an id', async () => {
    failIndex.add(2);
    const res = await makeService().send(actor, 'inv_1', {});
    assert.equal(res.failedCount, 1);
    const deliveries = recorded[0][3];
    assert.deepEqual(deliveries[1], { recipient: 'Ben@Client-A.example', accepted: false, providerMessageId: null });
  });

  it('records failures even when no recipient was accepted, before refusing', async () => {
    for (const i of [1, 2, 3]) failIndex.add(i);
    await assert.rejects(makeService().send(actor, 'inv_1', {}), (err) => err.getResponse?.().code === 'MAIL_SEND_FAILED');
    assert.equal(recorded.length, 1);
    assert.ok(recorded[0][3].every((d) => d.accepted === false && d.providerMessageId === null));
  });

  it('never fails a send because tracking failed', async () => {
    const res = await makeService({ trackingThrows: true }).send(actor, 'inv_1', {});
    assert.equal(res.sent, true);
    assert.equal(res.acceptedCount, 3);
  });
});
