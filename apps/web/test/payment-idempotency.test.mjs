/**
 * Payment submits carry an Idempotency-Key (D16).
 * Run: node --test test/payment-idempotency.test.mjs
 *
 * A retried or double-clicked payment submit must reuse its key so the API
 * records the payment once; a changed payload must get a new key.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createIdempotencyKeys } from '../src/lib/idempotency.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(webRoot, p), 'utf8');

describe('idempotency keys', () => {
  it('reuses the key for the same payload and renews it for a different one', () => {
    const keys = createIdempotencyKeys();
    const a = keys.keyFor('{"amountCents":100}');
    assert.equal(keys.keyFor('{"amountCents":100}'), a);
    const b = keys.keyFor('{"amountCents":200}');
    assert.notEqual(b, a);
    assert.match(b, /^[A-Za-z0-9_.:-]{8,100}$/, 'key must satisfy the API format');
  });

  it('starts fresh after a successful submit', () => {
    const keys = createIdempotencyKeys();
    const a = keys.keyFor('x');
    keys.reset();
    assert.notEqual(keys.keyFor('x'), a);
  });

  it('both payment forms send the header and reset only after success', () => {
    for (const page of ['app/(workspace)/finance/payments/page.tsx', 'app/(workspace)/finance/invoices/[id]/page.tsx']) {
      const src = read(page);
      assert.match(src, /'Idempotency-Key': \w+\.current\.keyFor\(body\)/, page);
      const post = src.indexOf("apiFetch('/payments', {");
      const reset = src.indexOf('.current.reset()', post);
      assert.ok(post > 0 && reset > post, `${page}: reset must follow the successful POST`);
    }
  });
});
