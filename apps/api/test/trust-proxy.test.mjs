/**
 * Trust proxy configuration (MAOS-T32).
 * Run: npm run build && node --test test/trust-proxy.test.mjs
 *
 * Behind Railway's proxy every request reaches the API from the proxy's
 * address. Without `trust proxy`, req.ip is that address for every user, so
 * the throttler (and login history) treat all users as one client. These
 * tests exercise the real helper from dist/ on a real Express app and prove:
 *
 *   - with the default of one trusted hop, req.ip is the address the proxy
 *     appended to X-Forwarded-For, and a client-supplied prefix is ignored;
 *   - with 0 hops, X-Forwarded-For is ignored entirely;
 *   - TRUST_PROXY_HOPS is validated (integer 0-5) and fails fast otherwise.
 */

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const helperPath = join(apiRoot, 'dist/common/http/trust-proxy.js');
const skip = existsSync(helperPath) ? false : 'run `npm run build` first';

function appWith(hops) {
  const express = require('express');
  const { configureTrustProxy } = require(helperPath);
  const app = express();
  configureTrustProxy(app, hops === undefined ? {} : { TRUST_PROXY_HOPS: String(hops) });
  app.get('/ip', (req, res) => res.json({ ip: req.ip }));
  return app;
}

const ipFor = async (app, xff) => {
  const request = require('supertest');
  const req = request(app).get('/ip');
  if (xff !== undefined) req.set('X-Forwarded-For', xff);
  return (await req).body.ip;
};

describe('configureTrustProxy', { skip }, () => {
  it('defaults to one trusted hop: req.ip is the address the proxy appended', async () => {
    assert.equal(await ipFor(appWith(undefined), '203.0.113.7'), '203.0.113.7');
  });

  it('ignores a client-supplied X-Forwarded-For prefix (no spoofing past the trusted hop)', async () => {
    assert.equal(await ipFor(appWith(1), '198.51.100.99, 203.0.113.7'), '203.0.113.7');
  });

  it('with 0 hops ignores X-Forwarded-For and uses the socket address', async () => {
    const ip = await ipFor(appWith(0), '203.0.113.7');
    assert.notEqual(ip, '203.0.113.7');
    assert.match(ip, /127\.0\.0\.1|::1/);
  });

  for (const bad of ['abc', '-1', '1.5', '6', '']) {
    it(`fails fast on TRUST_PROXY_HOPS=${JSON.stringify(bad)}`, () => {
      const { configureTrustProxy } = require(helperPath);
      const app = require('express')();
      assert.throws(() => configureTrustProxy(app, { TRUST_PROXY_HOPS: bad }), /TRUST_PROXY_HOPS/);
    });
  }
});
