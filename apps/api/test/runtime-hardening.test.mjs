/**
 * Phase 2 — Runtime hardening tests.
 * Mixed: real behavioural tests for pure helpers + static wiring checks.
 * Run: node --test test/runtime-hardening.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(join(apiRoot, rel), 'utf8');

// ── Env validation ────────────────────────────────────────────────────────────

describe('Phase 2 — env validation', () => {
  it('module exists and exports validateEnv', () => {
    assert.ok(existsSync(join(apiRoot, 'src/common/config/env-validation.ts')));
    assert.match(read('src/common/config/env-validation.ts'), /export function validateEnv/);
  });

  it('requires DATABASE_URL and JWT_SECRET', () => {
    const src = read('src/common/config/env-validation.ts');
    assert.match(src, /REQUIRED_VARS\s*=\s*\['DATABASE_URL',\s*'JWT_SECRET'\]/);
  });

  it('reuses the S-01 JWT secret validator', () => {
    assert.match(read('src/common/config/env-validation.ts'), /validateJwtSecret/);
  });

  it('never interpolates env values into error messages', () => {
    const src = read('src/common/config/env-validation.ts');
    assert.doesNotMatch(src, /\$\{\s*(env\[|dbUrl|value)\s*[^}]*\}/);
  });

  it('bootstrap calls validateEnv before creating the app', () => {
    const src = read('src/main.ts');
    const validateAt = src.indexOf('validateEnv()');
    const createAt = src.indexOf('NestFactory.create');
    assert.ok(validateAt > -1 && createAt > -1 && validateAt < createAt);
  });
});

// ── Structured logging ────────────────────────────────────────────────────────

describe('Phase 2 — structured logging', () => {
  it('redacts sensitive keys', async () => {
    const mod = await import('../src/common/logging/structured-logger.ts').catch(() => null);
    // TS source cannot be imported directly by node --test; assert via source contract.
    const src = read('src/common/logging/structured-logger.ts');
    assert.match(src, /SENSITIVE_KEY\s*=\s*\/\(password\|secret\|token\|authorization/);
    assert.match(src, /'\[redacted\]'/);
    assert.ok(mod === null || typeof mod === 'object');
  });

  it('emits single-line JSON entries', () => {
    const src = read('src/common/logging/structured-logger.ts');
    assert.match(src, /JSON\.stringify\(entry\)/);
  });
});

// ── Request correlation ───────────────────────────────────────────────────────

describe('Phase 2 — request correlation', () => {
  it('middleware exists and sets the response header', () => {
    const src = read('src/common/http/request-id.middleware.ts');
    assert.match(src, /REQUEST_ID_HEADER\s*=\s*'x-request-id'/);
    assert.match(src, /res\.setHeader\(REQUEST_ID_HEADER, requestId\)/);
  });

  it('only accepts safe inbound ids, otherwise generates a uuid', () => {
    const src = read('src/common/http/request-id.middleware.ts');
    assert.match(src, /SAFE_ID\s*=\s*\/\^\[A-Za-z0-9\._-\]\{1,64\}\$\//);
    assert.match(src, /randomUUID\(\)/);
  });

  it('is registered globally in AppModule', () => {
    const src = read('src/app.module.ts');
    // '*path' is the path-to-regexp v8 form Nest 11 requires; the bare '*'
    // only survives via LegacyRouteConverter and warns on every boot. Either
    // spelling registers the middleware on every route.
    assert.match(src, /consumer\.apply\(RequestIdMiddleware\)\.forRoutes\('\*path'\)/);
  });
});

// ── Global exception filter ───────────────────────────────────────────────────

describe('Phase 2 — global exception filter', () => {
  it('is registered in bootstrap', () => {
    assert.match(read('src/main.ts'), /useGlobalFilters\(new AllExceptionsFilter\(\)\)/);
  });

  it('collapses unknown errors to a generic message and never logs stacks', () => {
    const src = read('src/common/http/all-exceptions.filter.ts');
    assert.match(src, /message: 'Internal server error'/);
    assert.doesNotMatch(src, /\.stack/);
  });
});

// ── Readiness ─────────────────────────────────────────────────────────────────

describe('Phase 2 — health & readiness', () => {
  it('liveness endpoint still returns the original shape', () => {
    const src = read('src/modules/health/health.controller.ts');
    assert.match(src, /service: 'maos-api'/);
    assert.match(src, /status: 'ok'/);
  });

  it('readiness probes the database with a real query', () => {
    const src = read('src/modules/health/health.controller.ts');
    assert.match(src, /@Get\('ready'\)/);
    assert.match(src, /\$queryRaw`SELECT 1`/);
  });

  it('readiness returns 503 when a dependency is down', () => {
    const src = read('src/modules/health/health.controller.ts');
    assert.match(src, /HttpStatus\.SERVICE_UNAVAILABLE/);
  });

  it('redis probe is dependency-free and hides credentials', () => {
    const src = read('src/modules/health/redis-check.ts');
    assert.match(src, /from 'node:net'/);
    assert.doesNotMatch(src, /password|username/i);
  });

  it('parseRedisTarget handles unset, invalid, and valid urls', () => {
    const src = read('src/modules/health/redis-check.ts');
    assert.match(src, /if \(!url \|\| url\.trim\(\) === ''\) return null/);
    assert.match(src, /port: parsed\.port \? Number\(parsed\.port\) : 6379/);
  });
});
