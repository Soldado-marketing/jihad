/**
 * Plain-language errors (MAOS F02): every failed request shows a sentence a
 * person can act on. The API's own sentences pass through; codes, framework
 * defaults and internals never reach the screen, for staff or for clients.
 * Run: node --test test/plain-language-errors.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  apiErrorMessage,
  FORBIDDEN_MESSAGE,
  GENERIC_MESSAGE,
  isPlainMessage,
  NETWORK_MESSAGE,
  PLAIN_MESSAGES,
  SERVER_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
} from '../src/lib/api-errors.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('one sentence per status code', () => {
  it('401 and 403 keep their fixed wording whatever the body says', () => {
    assert.equal(apiErrorMessage(401, { message: 'Unauthorized' }), SESSION_EXPIRED_MESSAGE);
    assert.equal(apiErrorMessage(403, { code: 'FORBIDDEN', reason: 'own_entries_only' }), FORBIDDEN_MESSAGE);
    assert.equal(apiErrorMessage(403, { message: 'User is not a member of this tenant.' }), FORBIDDEN_MESSAGE);
  });

  it('404 and 409 fall back to plain sentences when the body only repeats the code', () => {
    assert.equal(apiErrorMessage(404, { statusCode: 404, message: 'Not Found' }), PLAIN_MESSAGES[404]);
    assert.equal(apiErrorMessage(404, { message: 'Cannot GET /api/invoices/x' }), PLAIN_MESSAGES[404]);
    assert.equal(apiErrorMessage(404, { code: 'USER_NOT_FOUND' }), PLAIN_MESSAGES[404]);
    assert.equal(apiErrorMessage(409, { message: 'Conflict' }), PLAIN_MESSAGES[409]);
    assert.equal(apiErrorMessage(409, { code: 'VERSION_MISMATCH', reason: 'version_mismatch' }), PLAIN_MESSAGES[409]);
  });

  it('400, 413, 415, 422 and 429 have their own sentences; unknown codes get the generic one', () => {
    assert.equal(apiErrorMessage(400, { code: 'INVALID_STATUS' }), PLAIN_MESSAGES[400]);
    assert.equal(apiErrorMessage(413, { message: 'Payload Too Large' }), PLAIN_MESSAGES[413]);
    assert.equal(apiErrorMessage(415, { message: 'Unsupported Media Type' }), PLAIN_MESSAGES[415]);
    assert.equal(apiErrorMessage(422, { code: 'FILE_NOT_CLEARED_FOR_CLIENT', reason: 'not_approved' }), PLAIN_MESSAGES[422]);
    assert.equal(apiErrorMessage(429, { message: 'Too Many Requests' }), PLAIN_MESSAGES[429]);
    assert.equal(apiErrorMessage(418), GENERIC_MESSAGE);
    assert.equal(apiErrorMessage(404), PLAIN_MESSAGES[404]);
  });

  it('5xx never shows what broke', () => {
    assert.equal(apiErrorMessage(500, { message: 'Internal server error' }), SERVER_MESSAGE);
    assert.equal(apiErrorMessage(500, { message: 'PrismaClientKnownRequestError P2002 Unique constraint failed' }), SERVER_MESSAGE);
    assert.equal(apiErrorMessage(502, 'Bad Gateway'), SERVER_MESSAGE);
    assert.equal(apiErrorMessage(503), SERVER_MESSAGE);
  });
});

describe('sentences the API wrote for people pass through', () => {
  it('keeps specific not-found and refusal sentences', () => {
    assert.equal(apiErrorMessage(404, { message: 'Invoice not found' }), 'Invoice not found');
    assert.equal(apiErrorMessage(409, { code: 'VERSION_NOT_ACTIVE', reason: 'Only an active version can be delivered.' }), 'Only an active version can be delivered.');
    assert.equal(apiErrorMessage(400, { code: 'UNKNOWN_TYPE', message: 'Unknown type: foo' }), 'Unknown type: foo');
  });

  it('joins validation messages into one line', () => {
    assert.equal(apiErrorMessage(400, { message: ['email must be an email', 'name should not be empty'] }), 'email must be an email. name should not be empty');
    assert.equal(apiErrorMessage(400, { message: ['email must be an email', 'INVALID_X'] }), PLAIN_MESSAGES[400]);
    assert.equal(apiErrorMessage(400, { message: [] }), PLAIN_MESSAGES[400]);
  });

  it('tells sentences from codes and internals', () => {
    for (const ok of ['Invoice not found', 'Only the owner can archive or restore a customer.', 'Fix the line items before creating the invoice.']) {
      assert.equal(isPlainMessage(ok), true, ok);
    }
    for (const bad of ['own_entries_only', 'FORBIDDEN', 'Not Found', 'Cannot DELETE /tasks/1', 'HTTP 404', 'x', 'a'.repeat(241), 'Line one\nline two', 'Cannot read properties of undefined', 'at Object.<anonymous> file.ts:12', 'Invalid `prisma.invoice.create()` invocation', 12, null, undefined]) {
      assert.equal(isPlainMessage(bad), false, String(bad));
    }
  });
});

describe('what people read', () => {
  it('uses no internal names in any fixed sentence', () => {
    const all = [...Object.values(PLAIN_MESSAGES), SESSION_EXPIRED_MESSAGE, FORBIDDEN_MESSAGE, NETWORK_MESSAGE, SERVER_MESSAGE, GENERIC_MESSAGE];
    for (const text of all) {
      assert.doesNotMatch(text, /tenant|prisma|HTTP|admin|audit|payroll|report|membership|jwt|token|api\b/i, text);
      assert.match(text, /^[A-Z].*\.$/, `a sentence: ${text}`);
    }
  });

  it('every transport in fetch.ts goes through the mapper, with no raw status left', () => {
    const src = read('src/lib/fetch.ts');
    assert.equal((src.match(/apiErrorMessage\(/g) ?? []).length, 3, 'apiFetch, apiUpload and apiBlob');
    assert.doesNotMatch(src, /HTTP \$\{/);
    assert.doesNotMatch(src, /body\.reason \?\? body\.message/);
    assert.equal((src.match(/throw new Error\(NETWORK_MESSAGE\)/g) ?? []).length, 2, 'fetch and blob network failures');
    assert.match(src, /reject\(new Error\(NETWORK_MESSAGE\)\)/, 'upload network failure');
    assert.match(src, /export \{ FORBIDDEN_MESSAGE, NETWORK_MESSAGE, SESSION_EXPIRED_MESSAGE \} from '\.\/api-errors';/);
  });

  it('client pages show the mapped message, never a raw response', () => {
    const client = read('app/(client)/client/invoices/page.tsx') + read('app/(client)/client/deliveries/[id]/page.tsx') + read('app/(client)/client/problems/page.tsx');
    assert.match(client, /err instanceof Error \? err\.message :/);
    assert.doesNotMatch(client, /res\.status|statusCode|JSON\.stringify\(err/);
  });
});
