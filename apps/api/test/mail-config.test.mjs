/**
 * SMTP readiness - how MailService reads its configuration and opens a socket.
 *
 * Two things are load-bearing here and both were found the hard way in
 * production:
 *
 *   1. The link base. Production defines WEB_URL and never APP_URL, so without
 *      the fallback a configured mailer sends real recipients links to
 *      http://localhost:3000.
 *   2. The address family. Nodemailer 9 resolves A and AAAA itself and picks one
 *      AT RANDOM, and the Railway container has an IPv6 interface with no route
 *      off it, so roughly half of all sends died with ENETUNREACH before TLS.
 *      The transport must therefore be pinned to IPv4 - while still presenting
 *      the hostname as the TLS servername, or certificate validation would be
 *      checking the wrong name.
 *
 * MailService reads process.env in its constructor and carries Nest decorators,
 * so it is required from dist/ (Node's type stripping cannot load decorators).
 * nodemailer.createTransport and dns.resolve4 are patched on the shared module
 * objects, which is what the service calls at runtime - no network, no DNS.
 *
 * Run: node --test test/mail-config.test.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, statSync } from 'node:fs';
import { isIPv4 } from 'node:net';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);

const SOURCE = 'src/modules/mail/mail.service.ts';
const COMPILED = 'dist/modules/mail/mail.service.js';

function ensureBuilt() {
  const out = join(apiRoot, COMPILED);
  const src = statSync(join(apiRoot, SOURCE)).mtimeMs;
  if (existsSync(out) && statSync(out).mtimeMs >= src) return;
  execFileSync('npm', ['run', 'build'], { cwd: apiRoot, stdio: 'ignore' });
}

ensureBuilt();
const { MailService } = require(join(apiRoot, COMPILED));
const nodemailer = require('nodemailer');
const dnsPromises = require('node:dns').promises;

const SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'APP_URL', 'WEB_URL'];
const saved = Object.fromEntries(SMTP_KEYS.map((k) => [k, process.env[k]]));

const realCreateTransport = nodemailer.createTransport;
const realResolve4 = dnsPromises.resolve4;

/** Every options object handed to nodemailer, and every message sent. */
let created = [];
let sent = [];
let resolve4Calls = [];
let resolve4Impl = async () => ['203.0.113.25'];

beforeEach(() => {
  created = []; sent = []; resolve4Calls = [];
  resolve4Impl = async () => ['203.0.113.25'];

  nodemailer.createTransport = (options) => {
    created.push(options);
    return { sendMail: async (message) => { sent.push(message); return { messageId: 'test' }; } };
  };
  dnsPromises.resolve4 = async (host) => { resolve4Calls.push(host); return resolve4Impl(host); };
});

afterEach(() => {
  nodemailer.createTransport = realCreateTransport;
  dnsPromises.resolve4 = realResolve4;
  for (const k of SMTP_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function serviceWith(env) {
  for (const k of SMTP_KEYS) delete process.env[k];
  Object.assign(process.env, { SMTP_HOST: 'smtp.example.test', SMTP_USER: 'u', SMTP_PASS: 'p' }, env);
  return new MailService();
}

const flush = async () => { for (let i = 0; i < 5; i += 1) await new Promise((r) => setImmediate(r)); };

// ── Address family: the production failure ───────────────────────────────────

describe('SMTP readiness - IPv4 pinning', () => {
  it('connects to a resolved IPv4 address, never the hostname', async () => {
    const service = serviceWith({});
    await service.sendDocument({ to: ['someone@example.test'], subject: 's', text: 't' });

    assert.equal(created.length, 1);
    assert.ok(isIPv4(created[0].host), `host must be an IPv4 literal, got ${created[0].host}`);
    assert.equal(created[0].host, '203.0.113.25');
    assert.deepEqual(resolve4Calls, ['smtp.example.test'], 'the A record must be the thing looked up');
  });

  it('keeps the hostname as the TLS servername so the certificate still matches', async () => {
    const service = serviceWith({});
    await service.sendDocument({ to: ['someone@example.test'], subject: 's', text: 't' });

    assert.equal(created[0].servername, 'smtp.example.test');
    assert.equal(created[0].tls?.servername, 'smtp.example.test');
  });

  it('reuses one pinned transport instead of resolving per message', async () => {
    const service = serviceWith({});
    await service.sendDocument({ to: ['a@example.test'], subject: 's', text: 't' });
    await service.sendDocument({ to: ['b@example.test'], subject: 's', text: 't' });

    assert.equal(created.length, 1, 'second send should reuse the pinned transport');
    assert.equal(resolve4Calls.length, 1);
    assert.equal(sent.length, 2);
  });

  it('surfaces a DNS failure instead of silently reporting success', async () => {
    const service = serviceWith({});
    resolve4Impl = async () => { throw new Error('ENOTFOUND'); };

    await assert.rejects(
      () => service.sendDocument({ to: ['someone@example.test'], subject: 's', text: 't' }),
      /ENOTFOUND/,
    );
    assert.equal(sent.length, 0);
  });

  it('refuses a host with no IPv4 address rather than falling back to IPv6', async () => {
    const service = serviceWith({});
    resolve4Impl = async () => [];

    await assert.rejects(
      () => service.sendDocument({ to: ['someone@example.test'], subject: 's', text: 't' }),
      /no IPv4 address/,
    );
  });

  it('uses implicit TLS on 465 and STARTTLS otherwise', async () => {
    const implicit = serviceWith({ SMTP_PORT: '465' });
    await implicit.sendDocument({ to: ['a@example.test'], subject: 's', text: 't' });
    assert.equal(created[0].secure, true);
    assert.equal(created[0].port, 465);

    created = [];
    const starttls = serviceWith({ SMTP_PORT: '587' });
    await starttls.sendDocument({ to: ['a@example.test'], subject: 's', text: 't' });
    assert.equal(created[0].secure, false);
    assert.equal(created[0].port, 587);
  });
});

// ── The link base ────────────────────────────────────────────────────────────

describe('SMTP readiness - email link base', () => {
  it('uses WEB_URL when APP_URL is unset, which is the production shape', async () => {
    const service = serviceWith({ WEB_URL: 'https://app.example.test' });
    service.sendApprovalEmail({ to: 'someone@example.test', name: 'Someone' });
    await flush();

    assert.equal(sent.length, 1);
    assert.match(sent[0].text, /https:\/\/app\.example\.test\/auth\/login/);
    assert.doesNotMatch(sent[0].text, /localhost/);
  });

  it('prefers APP_URL when both are set', async () => {
    const service = serviceWith({
      APP_URL: 'https://mail.example.test', WEB_URL: 'https://app.example.test',
    });
    service.notifyOwnerNewRequest({
      ownerEmail: 'owner@example.test', requesterName: 'A', requesterEmail: 'a@example.test',
      requestedRole: 'EMPLOYEE', tenantSlug: 'acme',
    });
    await flush();

    assert.match(sent[0].text, /https:\/\/mail\.example\.test\/dashboard/);
    assert.doesNotMatch(sent[0].text, /app\.example\.test/);
  });

  it('strips a trailing slash so links never double up', async () => {
    const service = serviceWith({ WEB_URL: 'https://app.example.test/' });
    service.sendApprovalEmail({ to: 'someone@example.test', name: 'Someone' });
    await flush();

    assert.doesNotMatch(sent[0].text, /example\.test\/\/auth/);
  });

  it('falls back to localhost only when neither is set', async () => {
    const service = serviceWith({});
    service.sendApprovalEmail({ to: 'someone@example.test', name: 'Someone' });
    await flush();

    assert.match(sent[0].text, /http:\/\/localhost:3000\/auth\/login/);
  });
});

// ── Configuration gate ───────────────────────────────────────────────────────

describe('SMTP readiness - configuration gate', () => {
  it('reports unconfigured until host, user and pass are all present', () => {
    for (const k of SMTP_KEYS) delete process.env[k];
    assert.equal(new MailService().isConfigured, false, 'nothing set');

    process.env.SMTP_HOST = 'smtp.example.test';
    assert.equal(new MailService().isConfigured, false, 'host only');

    process.env.SMTP_USER = 'u';
    assert.equal(new MailService().isConfigured, false, 'host and user only');

    process.env.SMTP_PASS = 'p';
    assert.equal(new MailService().isConfigured, true, 'host, user and pass');
  });

  it('sends nothing, and opens no socket, while unconfigured', async () => {
    for (const k of SMTP_KEYS) delete process.env[k];
    const service = new MailService();

    service.sendApprovalEmail({ to: 'someone@example.test', name: 'Someone' });
    await flush();

    const delivered = await service.sendDocument({ to: ['someone@example.test'], subject: 's', text: 't' });
    assert.equal(delivered, false, 'sendDocument must report failure, not pretend success');
    assert.equal(created.length, 0, 'no transport should be built');
    assert.equal(resolve4Calls.length, 0, 'no DNS lookup should happen');
    assert.equal(sent.length, 0);
  });
});

// ── sendDocument, the path invoices depend on ────────────────────────────────

describe('SMTP readiness - sendDocument', () => {
  it('refuses a recipient list with no usable address, before any lookup', async () => {
    const service = serviceWith({});
    const delivered = await service.sendDocument({ to: ['', 'not-an-address'], subject: 's', text: 't' });

    assert.equal(delivered, false);
    assert.equal(resolve4Calls.length, 0);
  });

  it('attaches the document and reports a true send', async () => {
    const service = serviceWith({});
    const delivered = await service.sendDocument({
      to: ['client@example.test'],
      subject: 'Invoice INV-1',
      text: 'Attached.',
      attachment: { filename: 'INV-1.pdf', content: Buffer.from('%PDF-'), contentType: 'application/pdf' },
    });

    assert.equal(delivered, true);
    assert.equal(sent[0].attachments.length, 1);
    assert.equal(sent[0].attachments[0].filename, 'INV-1.pdf');
    assert.equal(sent[0].to, 'client@example.test');
  });

  it('uses SMTP_FROM as the sender when set', async () => {
    const service = serviceWith({ SMTP_FROM: 'billing@example.test' });
    await service.sendDocument({ to: ['client@example.test'], subject: 's', text: 't' });
    assert.equal(sent[0].from, 'billing@example.test');
  });
});
