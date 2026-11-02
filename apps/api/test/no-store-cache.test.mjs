/**
 * J07 — API responses are `Cache-Control: no-store` by default.
 * Behavioural tests for the helper + static wiring checks.
 * Run: node --test test/no-store-cache.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyNoStoreDefault, CACHE_CONTROL_HEADER, NO_STORE } from '../src/common/http/no-store.ts';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(join(apiRoot, rel), 'utf8');

function fakeResponse(initial = {}) {
  const headers = new Map(Object.entries(initial).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    headers,
    hasHeader: (n) => headers.has(n.toLowerCase()),
    setHeader: (n, v) => { headers.set(n.toLowerCase(), v); },
  };
}

describe('J07 — no-store default', () => {
  it('sets Cache-Control: no-store when nothing was set', () => {
    const res = fakeResponse();
    assert.equal(applyNoStoreDefault(res), true);
    assert.equal(res.headers.get('cache-control'), NO_STORE);
  });

  it('never overrides a Cache-Control a handler already chose', () => {
    const res = fakeResponse({ 'Cache-Control': 'private, no-store' });
    assert.equal(applyNoStoreDefault(res), false);
    assert.equal(res.headers.get('cache-control'), 'private, no-store');
  });

  it('a handler that sets its own header later wins (setHeader replaces)', () => {
    const res = fakeResponse();
    applyNoStoreDefault(res);
    res.setHeader(CACHE_CONTROL_HEADER, 'private, max-age=0');
    assert.equal(res.headers.get('cache-control'), 'private, max-age=0');
  });

  it('is wired for every route in AppModule, next to the request id', () => {
    const src = read('src/app.module.ts');
    assert.match(src, /import \{ NoStoreMiddleware \} from '\.\/common\/http\/no-store\.middleware'/);
    assert.match(src, /consumer\.apply\(RequestIdMiddleware, NoStoreMiddleware\)\.forRoutes\('\*path'\)/);
  });

  it('inspects nothing from the request and delegates to the pure helper', () => {
    const src = read('src/common/http/no-store.middleware.ts');
    assert.doesNotMatch(src, /req\.(headers|body|query|params|user)/);
    assert.match(src, /applyNoStoreDefault\(res\)/);
  });

  it('file streams, invoice PDFs and CSV exports keep their explicit private, no-store policy', () => {
    assert.match(read('src/modules/files/files.controller.ts'), /setHeader\('Cache-Control', 'private, no-store'\)/);
    assert.match(read('src/modules/invoices/invoices.controller.ts'), /setHeader\('Cache-Control', 'private, no-store'\)/);
    assert.match(read('src/modules/import-export/import-export.controller.ts'), /@Header\('Cache-Control', 'no-store'\)/);
  });
});
