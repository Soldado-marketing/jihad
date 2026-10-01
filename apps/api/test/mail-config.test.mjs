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
const { MailService, MAIL_FROM, rateLimitWaitMs } = require(join(apiRoot, COMPILED));

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
    // Snapshot the headers: the service may reuse one headers object across a
    // retry, and a later mutation must not rewrite what an earlier call sent.
    calls.push({ init: { ...init, headers: { ...init.headers } }, url: String(url) });
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
    const result = await service.sendDocument({ subject: 's', text: 't', to: ['a@example.com'] });
    assert.equal(result.accepted, 0);
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

  it('passes subject and text to every valid recipient; drops invalid ones', async () => {
    const { service } = configured();
    const result = await service.sendDocument({
      subject: 'Invoice INV-1',
      text: 'Hello',
      to: ['a@example.com', 'not-an-address', 'b@example.com'],
    });
    assert.equal(result.recipientCount, 2);
    assert.equal(result.accepted, 2);
    assert.equal(calls.length, 2);
    for (const call of calls) {
      assert.equal(body(call).subject, 'Invoice INV-1');
      assert.equal(body(call).text, 'Hello');
    }
  });

  it('makes no request when no recipient is valid', async () => {
    const { service } = configured();
    const result = await service.sendDocument({ subject: 's', text: 't', to: ['nope'] });
    assert.equal(result.recipientCount, 0);
    assert.equal(result.accepted, 0);
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
  it('reports a Resend error as a failed recipient, with the status and reason logged', async () => {
    respond = () =>
      new Response(JSON.stringify({ message: 'The domain is not verified', name: 'validation_error' }), {
        headers: { 'content-type': 'application/json' },
        status: 403,
      });
    const { service, logs } = configured();
    const result = await service.sendDocument({ subject: 's', text: 't', to: ['a@example.com'] });
    assert.deepEqual([result.accepted, result.failed], [0, 1]);
    const errors = logs.filter(([level]) => level === 'error').map(([, line]) => line);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /HTTP 403/);
    assert.match(errors[0], /not verified/);
    for (const [, line] of logs) {
      assert.ok(!line.includes(FAKE_KEY));
      assert.ok(!line.includes('a@example.com'));
    }
  });

  it('reports a network failure as a failed recipient without leaking the key', async () => {
    respond = () => {
      throw new TypeError(`fetch failed while sending Bearer ${FAKE_KEY}`);
    };
    const { service, logs } = configured();
    const result = await service.sendDocument({ subject: 's', text: 't', to: ['a@example.com'] });
    assert.deepEqual([result.accepted, result.failed], [0, 1]);
    const errors = logs.filter(([level]) => level === 'error').map(([, line]) => line);
    assert.match(errors[0], /Resend request failed/);
    for (const [, line] of logs) assert.ok(!line.includes(FAKE_KEY));
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

describe('invoice recipient privacy - one message per recipient', () => {
  const RECIPIENTS = ['anna@client-a.example', 'ben@client-a.example', 'cara@other.example'];
  const pdf = Buffer.from('%PDF-1.7 invoice bytes', 'latin1');
  const sendAll = (service, to = RECIPIENTS) =>
    service.sendDocument({
      attachment: { content: pdf, contentType: 'application/pdf', filename: 'INV-1.pdf' },
      subject: 'Invoice INV-1',
      text: 'Invoice INV-1 is attached.',
      to,
    });

  it('sends exactly one request per recipient, each addressed to that recipient only', async () => {
    const { service } = configured();
    const result = await sendAll(service);
    assert.equal(calls.length, RECIPIENTS.length);
    assert.deepEqual(result, {
      accepted: 3,
      failed: 0,
      recipientCount: 3,
      resendEmailIds: ['msg_test_1', 'msg_test_1', 'msg_test_1'],
    });
    calls.forEach((call, i) => assert.deepEqual(body(call).to, [RECIPIENTS[i]]));
  });

  it('never exposes one recipient to another - not in to, cc, bcc, reply_to or anywhere in the body', async () => {
    const { service } = configured();
    await sendAll(service);
    calls.forEach((call, i) => {
      const raw = call.init.body;
      const b = body(call);
      assert.equal(b.cc, undefined);
      assert.equal(b.bcc, undefined);
      assert.equal(b.reply_to, undefined);
      RECIPIENTS.filter((_, j) => j !== i).forEach((other) => {
        assert.ok(!raw.includes(other), `request ${i} must not contain ${other}`);
      });
    });
  });

  it('attaches the identical PDF to every message', async () => {
    const { service } = configured();
    await sendAll(service);
    for (const call of calls) {
      const [att] = body(call).attachments;
      assert.equal(att.filename, 'INV-1.pdf');
      assert.ok(Buffer.from(att.content, 'base64').equals(pdf));
    }
  });

  it('sends a duplicated address once, compared case-insensitively', async () => {
    const { service } = configured();
    const result = await sendAll(service, ['anna@client-a.example', 'ANNA@client-a.example ', 'ben@client-a.example']);
    assert.equal(result.recipientCount, 2);
    assert.equal(calls.length, 2);
  });

  it('keeps going after one recipient fails and reports the partial result', async () => {
    let n = 0;
    respond = () => {
      n += 1;
      return n === 2 ? new Response('{}', { status: 422 }) : ok(`msg_${n}`);
    };
    const { service } = configured();
    const result = await sendAll(service);
    assert.equal(calls.length, 3);
    assert.deepEqual(result, { accepted: 2, failed: 1, recipientCount: 3, resendEmailIds: ['msg_1', 'msg_3'] });
  });

  it('gives each recipient its own idempotency key', async () => {
    const { service } = configured();
    await sendAll(service);
    const keys = calls.map((call) => call.init.headers['Idempotency-Key']);
    assert.equal(new Set(keys).size, keys.length);
    for (const key of keys) assert.match(key, /^document-[0-9a-f-]{36}-\d+$/);
  });

  it('does not retry any other error', async () => {
    respond = () => new Response('{}', { status: 500 });
    const { service } = configured();
    const result = await sendAll(service, ['anna@client-a.example']);
    assert.equal(calls.length, 1);
    assert.equal(result.failed, 1);
  });

  it('logs counts only - never a recipient address', async () => {
    let n = 0;
    respond = () => ((n += 1) === 2 ? new Response('{}', { status: 500 }) : ok());
    const { service, logs } = configured();
    await sendAll(service);
    assert.ok(logs.some(([, line]) => /recipients=3 accepted=2 failed=1/.test(line)));
    for (const [, line] of logs) {
      for (const address of RECIPIENTS) assert.ok(!line.includes(address));
    }
  });
});

describe('rate limit (429) - wait as told, retry once, same idempotency key', () => {
  const r429 = (headers = {}) => new Response('{}', { headers, status: 429 });
  const once429 = (headers) => {
    let n = 0;
    respond = () => ((n += 1) === 1 ? r429(headers) : ok('msg_after_retry'));
  };
  const configuredWithClock = () => {
    const made = configured();
    made.waits = [];
    made.service.sleep = async (ms) => {
      made.waits.push(ms);
    };
    return made;
  };
  const sendOne = (service) => service.sendDocument({ subject: 's', text: 't', to: ['anna@client-a.example'] });

  it('waits the Retry-After seconds before the single retry', async () => {
    once429({ 'retry-after': '3' });
    const { service, waits } = configuredWithClock();
    const result = await sendOne(service);
    assert.deepEqual(waits, [3000]);
    assert.equal(calls.length, 2);
    assert.deepEqual(result.resendEmailIds, ['msg_after_retry']);
  });

  it('reuses the same Idempotency-Key on the retry', async () => {
    once429({ 'retry-after': '1' });
    const { service } = configuredWithClock();
    await sendOne(service);
    assert.ok(calls[0].init.headers['Idempotency-Key']);
    assert.equal(calls[0].init.headers['Idempotency-Key'], calls[1].init.headers['Idempotency-Key']);
  });

  it('honours an HTTP-date Retry-After', () => {
    const now = Date.parse('2026-09-23T10:00:00Z');
    const headers = new Headers({ 'retry-after': 'Wed, 23 Sep 2026 10:00:04 GMT' });
    assert.equal(rateLimitWaitMs(headers, now), 4000);
  });

  it('falls back to ratelimit-reset, then to one second', () => {
    assert.equal(rateLimitWaitMs(new Headers({ 'ratelimit-reset': '2' })), 2000);
    assert.equal(rateLimitWaitMs(new Headers()), 1000);
    assert.equal(rateLimitWaitMs(new Headers({ 'retry-after': 'garbage' })), 1000);
  });

  it('does not retry early when Resend asks for more than 10 seconds - the message is reported failed', async () => {
    once429({ 'retry-after': '60' });
    const { service, waits } = configuredWithClock();
    const result = await sendOne(service);
    assert.deepEqual(waits, []);
    assert.equal(calls.length, 1);
    assert.deepEqual([result.accepted, result.failed], [0, 1]);
  });

  it('retries at most once - a second 429 fails the message', async () => {
    respond = () => r429({ 'retry-after': '0' });
    const { service, waits } = configuredWithClock();
    const result = await sendOne(service);
    assert.equal(calls.length, 2);
    assert.deepEqual(waits, [0]);
    assert.equal(result.failed, 1);
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
