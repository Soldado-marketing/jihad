/**
 * Throttling is per client behind a proxy (MAOS-T32).
 *
 * Drives the real AppModule with the same trust-proxy configuration as
 * main.ts. Login allows 10 attempts per minute; the 11th from one client must
 * be refused with 429, while a different client behind the same proxy is
 * still served. Without trust proxy both "clients" share the proxy address
 * and the second would be throttled too.
 *
 * Prerequisites (otherwise the whole suite skips rather than failing):
 *   npm run build; migrated PostgreSQL; DATABASE_URL + JWT_SECRET; MAOS_INTEGRATION=1.
 */

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const enabled = process.env.MAOS_INTEGRATION === '1';
const built = existsSync(join(apiRoot, 'dist/app.module.js'));
const configured = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);
const skip = !enabled
  ? 'set MAOS_INTEGRATION=1 to run'
  : !built
    ? 'run `npm run build` first'
    : !configured
      ? 'DATABASE_URL and JWT_SECRET must be set'
      : false;

let app;
let server;
let request;

before(async () => {
  if (skip) return;
  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require(join(apiRoot, 'dist/app.module.js'));
  const { configureTrustProxy } = require(join(apiRoot, 'dist/common/http/trust-proxy.js'));
  app = await NestFactory.create(AppModule, { logger: false });
  configureTrustProxy(app, {});
  app.setGlobalPrefix('api');
  await app.init();
  server = app.getHttpServer();
  request = require('supertest');
});

after(async () => {
  if (app) await app.close();
});

const attempt = (clientIp) =>
  request(server)
    .post('/api/auth/login')
    .set('X-Forwarded-For', clientIp)
    .send({ email: `nobody-${clientIp}@example.test`, passwordOrMagicCode: 'x', tenantSlug: 'none' });

describe('throttling behind a proxy', { skip }, () => {
  it('throttles one client after its own 10 login attempts', async () => {
    for (let i = 0; i < 10; i += 1) {
      const res = await attempt('203.0.113.10');
      assert.notEqual(res.status, 429, `attempt ${i + 1} throttled too early`);
    }
    assert.equal((await attempt('203.0.113.10')).status, 429);
  });

  it('still serves a different client behind the same proxy', async () => {
    const res = await attempt('203.0.113.20');
    assert.notEqual(res.status, 429);
  });
});
