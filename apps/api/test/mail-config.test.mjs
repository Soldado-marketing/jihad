/**
 * Resend transport - how MailService reads its configuration and hands mail to
 * Resend over HTTPS.
 *
 * Load-bearing properties, each found or decided the hard way:
 *
 *   1. Fail closed. With no RESEND_API_KEY nothing is sent and the invoice path
 *      is told so (sendDocument resolves false). The old SMTP_* variables must
 *      not switch anything back on.
 *   2. One sender. The From address is fixed to no-reply@soldado-marketing.de
 *      (owner decision) and no environment variable can change it.
 *   3. The key never leaves the Authorization header - not into an error, not
 *      into a log line.
 *   4. Invoice PDFs survive the trip: base64 on the wire, identical bytes back.
 *   5. The link base. Production defines WEB_URL and never APP_URL, so without
 *      the fallback a configured mailer sends real recipients links to
 *      http://localhost:3000.
 *
 * MailService reads process.env in its constructor and carries Nest decorators,
 * so it is required from dist/ (Node's type stripping cannot load decorators).
 * globalThis.fetch is replaced per test - no network.
 *
 * Run: node --test test/mail-config.test.mjs
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, statSync } from 'node:fs';
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
const { MailService, MAIL_FROM } = require(join(apiRoot, COMPILED));

const APPROVED_FROM = 'no-reply@soldado-marketing.de';
const RESEND_URL = 'https://api.resend.com/emails';
const FAKE_KEY = 're_test_0123456789abcdefSECRET';
const MAIL_ENV = [
  'RESEND_API_KEY',
  'APP_URL',
  'WEB_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'MAIL_FROM',
];

const realFetch = globalThis.fetch;
let savedEnv;
/** Every request handed to fetch. */
let calls;
/** How the fake Resend answers the next request. */
let respond;

function ok(id = 'msg_test_1') {
  return new Response(JSON.stringify({ id }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });
}

beforeEach(() => {
  savedEnv = Object.fromEntries(MAIL_ENV.map((k) => [k, process.env[k]]));
  for (const k of MAIL_ENV) delete process.env[k];
  calls = [];
  respond = () => ok();
  globalThis.fetch = async (url, init) => {
    calls.push({ init, url: String(url) });
    return respond(url, init);
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const k of MAIL_ENV) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

function makeService(env = {}) {
  Object.assign(process.env, env);
  const service = new MailService();
  const logs = [];
  // Capture what the service would write to the log, to prove what never reaches it.
  service.logger = {
    error: (m) => logs.push(['error', String(m)]),
    log: (m) => logs.push(['log', String(m)]),
    warn: (m) => logs.push(['warn', String(m)]),
  };
  return { logs, service };
}

const configured = (extra = {}) => makeService({ RESEND_API_KEY: FAKE_KEY, ...extra });
const body = (call) => JSON.parse(call.init.body);
/** Let fire-and-forget sends settle. */
const settle = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
};

describe('fail closed without RESEND_API_KEY', () => {
  it('is not configured when the key is absent', () => {
    assert.equal(makeService().service.isConfigured, false);
  });

  it('is not configured when the key is only whitespace', () => {
    assert.equal(makeService({ RESEND_API_KEY: '   ' }).service.isConfigured, false);
  });

  it('is configured once the key is present', () => {
    assert.equal(configured().service.isConfigured, true);
  });

  it('is not switched on by the old SMTP_* variables', () => {
    const { service } = makeService({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PASS: 'x',
      SMTP_PORT: '465',
      SMTP_USER: 'u',
    });
    assert.equal(service.isConfigured, false);
  });

  it('sends no notification and makes no request', async () => {
    const { service } = makeService();
    service.sendApprovalEmail({ name: 'N', to: 'a@example.com' });
    service.sendRejectionEmail({ name: 'N', to: 'a@example.com' });
    service.notifyOwnerNewRequest({
      ownerEmail: 'o@example.com',
      requestedRole: 'CLIENT',
      requesterEmail: 'r@example.com',
      requesterName: 'R',
      tenantSlug: 't',
    });
    await settle();
    assert.equal(calls.length, 0);
  });

  it('reports an invoice send as not sent, without a request', async () => {
    const { service } = makeService();
    const sent = await service.sendDocument({ subject: 's', text: 't', to: ['a@example.com'] });
    assert.equal(sent, false);
    assert.equal(calls.length, 0);
  });
});

describe('request to Resend', () => {
  it('posts JSON to the Resend endpoint with the key as a Bearer token', async () => {
    const { service } = configured();
    await service.sendDocument({ subject: 's', text: 't', to: ['a@example.com'] });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, RESEND_URL);
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.headers.Authorization, `Bearer ${FAKE_KEY}`);
    assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  });

  it('bounds every request with a timeout signal', async () => {
    const { service } = configured();
    await service.sendDocument({ subject: 's', text: 't', to: ['a@example.com'] });
    assert.ok(calls[0].init.signal instanceof AbortSignal);
  });

  it('exports the approved sender', () => {
    assert.equal(MAIL_FROM, APPROVED_FROM);
  });

  it('always sends from the approved address, whatever the environment says', async () => {
    const { service } = configured({ MAIL_FROM: 'evil@example.com', SMTP_FROM: 'info@soldado-marketing.de' });
    await service.sendDocument({ subject: 's', text: 't', to: ['a@example.com'] });
    service.sendApprovalEmail({ name: 'N', to: 'b@example.com' });
    await settle();
    assert.equal(calls.length, 2);
    for (const call of calls) assert.equal(body(call).from, APPROVED_FROM);
  });

  it('passes subject, text and every valid recipient; drops invalid ones', async () => {
    const { service } = configured();
    const sent = await service.sendDocument({
      subject: 'Invoice INV-1',
      text: 'Hello',
      to: ['a@example.com', 'not-an-address', 'b@example.com'],
    });
    assert.equal(sent, true);
    const b = body(calls[0]);
    assert.deepEqual(b.to, ['a@example.com', 'b@example.com']);
    assert.equal(b.subject, 'Invoice INV-1');
    assert.equal(b.text, 'Hello');
  });

  it('makes no request when no recipient is valid', async () => {
    const { service } = configured();
    const sent = await service.sendDocument({ subject: 's', text: 't', to: ['nope'] });
    assert.equal(sent, false);
    assert.equal(calls.length, 0);
  });

  it('carries an invoice PDF as base64 that decodes to the original bytes', async () => {
    const { service } = configured();
    const pdf = Buffer.from('%PDF-1.7\n\u0000ÿ binary tail', 'latin1');
    await service.sendDocument({
      attachment: { content: pdf, contentType: 'application/pdf', filename: 'INV-1.pdf' },
      subject: 's',
      text: 't',
      to: ['a@example.com'],
    });
    const [att] = body(calls[0]).attachments;
    assert.equal(att.filename, 'INV-1.pdf');
    assert.equal(att.content_type, 'application/pdf');
    assert.ok(Buffer.from(att.content, 'base64').equals(pdf));
  });

  it('sends a notification as a single-recipient message', async () => {
    const { service } = configured();
    service.sendRejectionEmail({ name: 'N', to: 'x@example.com' });
    await settle();
    assert.equal(calls.length, 1);
    assert.deepEqual(body(calls[0]).to, ['x@example.com']);
    assert.equal(body(calls[0]).subject, 'Your account request was not approved');
  });
});

describe('failures', () => {
  it('rejects an invoice send on a Resend error, with the status and reason', async () => {
    respond = () =>
      new Response(JSON.stringify({ message: 'The domain is not verified', name: 'validation_error' }), {
        headers: { 'content-type': 'application/json' },
        status: 403,
      });
    const { service } = configured();
    await assert.rejects(
      service.sendDocument({ subject: 's', text: 't', to: ['a@example.com'] }),
      (err) => {
        assert.match(err.message, /HTTP 403/);
        assert.match(err.message, /not verified/);
        assert.ok(!err.message.includes(FAKE_KEY));
        return true;
      },
    );
  });

  it('rejects on a network failure without leaking the key', async () => {
    respond = () => {
      throw new TypeError(`fetch failed while sending Bearer ${FAKE_KEY}`);
    };
    const { service } = configured();
    await assert.rejects(
      service.sendDocument({ subject: 's', text: 't', to: ['a@example.com'] }),
      (err) => {
        assert.match(err.message, /Resend request failed/);
        assert.ok(!err.message.includes(FAKE_KEY));
        return true;
      },
    );
  });

  it('swallows a failed notification and logs it without the key or the recipient', async () => {
    respond = () => new Response('{}', { status: 500 });
    const { service, logs } = configured();
    assert.doesNotThrow(() => service.sendApprovalEmail({ name: 'N', to: 'person@example.com' }));
    await settle();
    const errors = logs.filter(([level]) => level === 'error');
    assert.equal(errors.length, 1);
    assert.match(errors[0][1], /HTTP 500/);
    for (const [, line] of logs) {
      assert.ok(!line.includes(FAKE_KEY), 'key must never be logged');
      assert.ok(!line.includes('person@example.com'), 'recipient must never be logged');
    }
  });

  it('never logs the key on a successful send', async () => {
    const { service, logs } = configured();
    await service.sendDocument({ subject: 's', text: 't', to: ['a@example.com'] });
    service.sendApprovalEmail({ name: 'N', to: 'b@example.com' });
    await settle();
    assert.ok(logs.length > 0);
    for (const [, line] of logs) assert.ok(!line.includes(FAKE_KEY));
  });
});

describe('link base', () => {
  const linkIn = (call) => body(call).text;

  it('uses WEB_URL when APP_URL is absent, without a trailing slash', async () => {
    const { service } = configured({ WEB_URL: 'https://app.example.com/' });
    service.sendApprovalEmail({ name: 'N', to: 'a@example.com' });
    await settle();
    assert.match(linkIn(calls[0]), /https:\/\/app\.example\.com\/auth\/login/);
    assert.doesNotMatch(linkIn(calls[0]), /localhost/);
  });

  it('prefers APP_URL when both are set', async () => {
    const { service } = configured({ APP_URL: 'https://a.example.com', WEB_URL: 'https://w.example.com' });
    service.notifyOwnerNewRequest({
      ownerEmail: 'o@example.com',
      requestedRole: 'CLIENT',
      requesterEmail: 'r@example.com',
      requesterName: 'R',
      tenantSlug: 't',
    });
    await settle();
    assert.match(linkIn(calls[0]), /https:\/\/a\.example\.com\/dashboard\/admin\/users\/requests/);
  });
});

describe('source hygiene', () => {
  const src = readFileSync(join(apiRoot, SOURCE), 'utf8');
  const pkg = JSON.parse(readFileSync(join(apiRoot, 'package.json'), 'utf8'));

  it('no longer uses nodemailer, SMTP settings or the IPv4 DNS workaround', () => {
    assert.doesNotMatch(src, /nodemailer/);
    assert.doesNotMatch(src, /process\.env\.SMTP_/);
    assert.doesNotMatch(src, /resolve4|node:dns/);
  });

  it('does not depend on nodemailer', () => {
    assert.equal(pkg.dependencies?.nodemailer, undefined);
    assert.equal(pkg.devDependencies?.['@types/nodemailer'], undefined);
  });

  it('never passes the key to a logger call', () => {
    assert.doesNotMatch(src, /logger\.\w+\([^;]*apiKey/);
  });
});
