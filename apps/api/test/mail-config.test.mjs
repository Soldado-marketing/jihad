/**
 * SMTP readiness - how MailService reads its configuration.
 *
 * The link base matters more than it looks: production defines WEB_URL and
 * never APP_URL, so before the fallback existed, switching SMTP on would have
 * sent real recipients links to http://localhost:3000. These tests assert the
 * resolved URL through an actual rendered message rather than by reading the
 * field, so they fail if the chain regresses.
 *
 * MailService reads process.env in its constructor and carries Nest decorators,
 * so it is required from dist/ (Node's type stripping cannot load decorators)
 * and a fresh instance is built per case.
 *
 * Run: node --test test/mail-config.test.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, it } from 'node:test';
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

const SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'APP_URL', 'WEB_URL'];
const saved = Object.fromEntries(SMTP_KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of SMTP_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

/** Builds a service with a recording transporter so a real message can be read back. */
function serviceWith(env) {
  for (const k of SMTP_KEYS) delete process.env[k];
  Object.assign(process.env, { SMTP_HOST: 'smtp.invalid', SMTP_USER: 'u', SMTP_PASS: 'p' }, env);

  const service = new MailService();
  const sent = [];
  service.transporter = {
    sendMail: async (message) => { sent.push(message); return { messageId: 'test' }; },
  };
  return { service, sent };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

// ── The link base ────────────────────────────────────────────────────────────

describe('SMTP readiness - email link base', () => {
  it('uses WEB_URL when APP_URL is unset, which is the production shape', async () => {
    const { service, sent } = serviceWith({ WEB_URL: 'https://app.example.test' });
    service.sendApprovalEmail({ to: 'someone@example.test', name: 'Someone' });
    await flush();

    assert.equal(sent.length, 1);
    assert.match(sent[0].text, /https:\/\/app\.example\.test\/auth\/login/);
    assert.doesNotMatch(sent[0].text, /localhost/);
  });

  it('prefers APP_URL when both are set', async () => {
    const { service, sent } = serviceWith({
      APP_URL: 'https://mail.example.test',
      WEB_URL: 'https://app.example.test',
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
    const { service, sent } = serviceWith({ WEB_URL: 'https://app.example.test/' });
    service.sendApprovalEmail({ to: 'someone@example.test', name: 'Someone' });
    await flush();

    assert.doesNotMatch(sent[0].text, /example\.test\/\/auth/);
  });

  it('falls back to localhost only when neither is set', async () => {
    const { service, sent } = serviceWith({});
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

    process.env.SMTP_HOST = 'smtp.invalid';
    assert.equal(new MailService().isConfigured, false, 'host only');

    process.env.SMTP_USER = 'u';
    assert.equal(new MailService().isConfigured, false, 'host and user only');

    process.env.SMTP_PASS = 'p';
    assert.equal(new MailService().isConfigured, true, 'host, user and pass');
  });

  it('sends nothing at all while unconfigured', async () => {
    for (const k of SMTP_KEYS) delete process.env[k];
    const service = new MailService();
    const sent = [];
    service.transporter = null;

    service.sendApprovalEmail({ to: 'someone@example.test', name: 'Someone' });
    await flush();
    assert.equal(sent.length, 0);

    const delivered = await service.sendDocument({ to: ['someone@example.test'], subject: 's', text: 't' });
    assert.equal(delivered, false, 'sendDocument must report failure, not pretend success');
  });
});

// ── sendDocument, the path invoices depend on ────────────────────────────────

describe('SMTP readiness - sendDocument', () => {
  it('refuses a recipient list with no usable address', async () => {
    const { service } = serviceWith({});
    const delivered = await service.sendDocument({ to: ['', 'not-an-address'], subject: 's', text: 't' });
    assert.equal(delivered, false);
  });

  it('attaches the document and reports a true send', async () => {
    const { service, sent } = serviceWith({});
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
    const { service, sent } = serviceWith({ SMTP_FROM: 'billing@example.test' });
    await service.sendDocument({ to: ['client@example.test'], subject: 's', text: 't' });
    assert.equal(sent[0].from, 'billing@example.test');
  });
});
