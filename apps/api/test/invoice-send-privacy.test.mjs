/**
 * Invoice send - recipient privacy and partial-send semantics, end to end
 * through InvoicesService with the real MailService.
 *
 * Only the network (globalThis.fetch), the database repository, the PDF
 * renderer and the audit writer are stubbed. What reaches "Resend" is exactly
 * what production would send.
 *
 *   - every recipient gets its own message; no message names another recipient
 *   - the invoice is marked SENT only when at least one message was accepted
 *   - a partial send is reported (acceptedCount / failedCount), not hidden
 *   - nothing accepted -> MAIL_SEND_FAILED and the invoice is left as it was
 *
 * Run: node --test test/invoice-send-privacy.test.mjs
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

const CLIENTS = ['anna@client-a.example', 'ben@client-a.example', 'cara@client-a.example'];
const realFetch = globalThis.fetch;
const savedKey = process.env.RESEND_API_KEY;
let calls;
let respond;
let marked;

beforeEach(() => {
  process.env.RESEND_API_KEY = 're_test_invoice_privacy';
  calls = [];
  marked = [];
  respond = (n) => new Response(JSON.stringify({ id: `msg_${n}` }), { status: 200 });
  globalThis.fetch = async (url, init) => {
    calls.push({ init, url: String(url) });
    return respond(calls.length);
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
  if (savedKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = savedKey;
});

function makeInvoices() {
  const mail = new MailService();
  mail.logger = { error() {}, log() {}, warn() {} };
  const invoice = {
    currency: 'EUR',
    id: 'inv_1',
    invoiceNumber: 'INV-1',
    paidCents: 0,
    projectId: 'proj_1',
    status: 'DRAFT',
    tenantId: 't_1',
    totalCents: 12000,
  };
  const repo = {
    findProjectClientEmails: async () => CLIENTS.map((email) => ({ email })),
    getForPdf: async () => invoice,
    markSent: async (tenantId, id) => {
      marked.push(id);
      return { ...invoice, status: 'SENT' };
    },
  };
  const audit = { createAuditEvent: async () => undefined };
  const service = new InvoicesService(repo, {}, mail, audit, {});
  service.renderPdf = async () => ({ buffer: Buffer.from('%PDF-1.7 test'), filename: 'invoice-INV-1.pdf' });
  return service;
}

const actor = { actorId: 'u_owner', role: 'OWNER', tenantId: 't_1' };

describe('invoice send - recipient privacy', () => {
  it('sends the project clients one message each; no message contains another client', async () => {
    const res = await makeInvoices().send(actor, 'inv_1', {});
    assert.equal(calls.length, CLIENTS.length);
    calls.forEach((call, i) => {
      const payload = JSON.parse(call.init.body);
      assert.deepEqual(payload.to, [CLIENTS[i]]);
      assert.equal(payload.cc, undefined);
      assert.equal(payload.bcc, undefined);
      CLIENTS.filter((_, j) => j !== i).forEach((other) => assert.ok(!call.init.body.includes(other)));
      assert.equal(payload.attachments.length, 1);
    });
    assert.deepEqual(
      { accepted: res.acceptedCount, failed: res.failedCount, recipients: res.recipientCount, sent: res.sent },
      { accepted: 3, failed: 0, recipients: 3, sent: true },
    );
    assert.deepEqual(marked, ['inv_1']);
  });

  it('keeps explicit recipients private from each other too', async () => {
    const explicit = ['x@one.example', 'y@two.example'];
    await makeInvoices().send(actor, 'inv_1', { recipients: explicit });
    assert.equal(calls.length, 2);
    assert.ok(!calls[0].init.body.includes('y@two.example'));
    assert.ok(!calls[1].init.body.includes('x@one.example'));
  });
});

describe('invoice send - partial and failed sends', () => {
  it('marks the invoice SENT and reports the failure when only some messages are accepted', async () => {
    respond = (n) => (n === 2 ? new Response('{}', { status: 422 }) : new Response(JSON.stringify({ id: `msg_${n}` }), { status: 200 }));
    const res = await makeInvoices().send(actor, 'inv_1', {});
    assert.equal(res.acceptedCount, 2);
    assert.equal(res.failedCount, 1);
    assert.deepEqual(marked, ['inv_1']);
  });

  it('refuses with MAIL_SEND_FAILED and leaves the invoice unmarked when nothing is accepted', async () => {
    respond = () => new Response('{}', { status: 500 });
    await assert.rejects(makeInvoices().send(actor, 'inv_1', {}), (err) => {
      assert.equal(err.getStatus(), 503);
      assert.equal(err.getResponse().code, 'MAIL_SEND_FAILED');
      return true;
    });
    assert.deepEqual(marked, []);
  });
});
