/**
 * Security MVP (Stage A) — static source-analysis tests.
 * No live server or DB required. Run: node --test test/security-mvp.test.mjs
 *
 * Guards S-01 (JWT secret validation), S-03 (rate limiting),
 * S-04 (Helmet headers), and S-05 (environment-based CORS).
 */

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(join(apiRoot, rel), 'utf8');

// ── S-01: JWT secret validation ───────────────────────────────────────────────

describe('S-01 — JWT secret validation', () => {
  it('jwt-secret.ts validator module exists', () => {
    assert.ok(existsSync(join(apiRoot, 'src/common/config/jwt-secret.ts')));
  });

  it('validator exports validateJwtSecret and enforces a 32-char minimum', () => {
    const src = read('src/common/config/jwt-secret.ts');
    assert.match(src, /export function validateJwtSecret/);
    assert.match(src, /MIN_JWT_SECRET_LENGTH\s*=\s*32/);
    assert.match(src, /changeme/, 'must reject the "changeme" placeholder');
  });

  it('validator never interpolates the secret value into error messages', () => {
    const src = read('src/common/config/jwt-secret.ts');
    // Error messages must not embed the secret variable.
    assert.doesNotMatch(src, /throw new Error\([^)]*\$\{\s*(value|secret)\s*\}/);
  });

  it('auth.module.ts uses the validator and drops the "changeme" fallback', () => {
    const src = read('src/modules/auth/auth.module.ts');
    assert.match(src, /validateJwtSecret\(config\.get<string>\('JWT_SECRET'\)\)/);
    assert.doesNotMatch(src, /'changeme'/);
  });

  it('jwt.strategy.ts uses the validator and drops the "changeme" fallback', () => {
    const src = read('src/common/auth/jwt.strategy.ts');
    assert.match(src, /validateJwtSecret\(config\.get<string>\('JWT_SECRET'\)\)/);
    assert.doesNotMatch(src, /'changeme'/);
  });
});

// ── S-04: Helmet security headers ─────────────────────────────────────────────

describe('S-04 — Helmet security headers', () => {
  it('main.ts imports helmet and installs it before routing', () => {
    const src = read('src/main.ts');
    assert.match(src, /import helmet from 'helmet'/);
    assert.match(src, /app\.use\(\s*helmet\(/);
  });

  it('helmet is configured to allow the cross-origin web app', () => {
    const src = read('src/main.ts');
    assert.match(src, /crossOriginResourcePolicy:\s*\{\s*policy:\s*'cross-origin'\s*\}/);
  });

  it('helmet is declared as a dependency', () => {
    const pkg = JSON.parse(read('package.json'));
    assert.ok(pkg.dependencies.helmet, 'helmet must be in dependencies');
  });
});

// ── S-03: Rate limiting ───────────────────────────────────────────────────────

describe('S-03 — Authentication rate limiting', () => {
  it('app.module.ts registers ThrottlerModule with a global default', () => {
    const src = read('src/app.module.ts');
    assert.match(src, /ThrottlerModule\.forRoot\(\[\{\s*ttl:\s*\d+,\s*limit:\s*\d+\s*\}\]\)/);
  });

  it('app.module.ts registers ThrottlerGuard as a global APP_GUARD', () => {
    const src = read('src/app.module.ts');
    assert.match(src, /provide:\s*APP_GUARD,\s*useClass:\s*ThrottlerGuard/);
  });

  it('auth.controller.ts applies stricter @Throttle limits to login/register/refresh', () => {
    const src = read('src/modules/auth/auth.controller.ts');
    assert.match(src, /import \{ Throttle \} from '@nestjs\/throttler'/);
    const throttleCount = (src.match(/@Throttle\(/g) ?? []).length;
    assert.ok(throttleCount >= 3, `expected >=3 @Throttle decorators, found ${throttleCount}`);
  });

  it('@nestjs/throttler is declared as a dependency', () => {
    const pkg = JSON.parse(read('package.json'));
    assert.ok(pkg.dependencies['@nestjs/throttler'], '@nestjs/throttler must be in dependencies');
  });
});

// ── S-05: Environment-based CORS ──────────────────────────────────────────────

describe('S-05 — Environment-based CORS', () => {
  it('main.ts resolves origins from CORS_ORIGINS / WEB_URL env', () => {
    const src = read('src/main.ts');
    assert.match(src, /process\.env\.CORS_ORIGINS/);
    assert.match(src, /process\.env\.WEB_URL/);
  });

  it('CORS uses a dynamic allow-list callback, not a hardcoded-only array', () => {
    const src = read('src/main.ts');
    assert.match(src, /origin:\s*\(origin,\s*callback\)\s*=>/);
    assert.doesNotMatch(src, /origin:\s*\['http:\/\/localhost:3000'\]/);
  });

  it('does not combine wildcard origin with credentials', () => {
    const src = read('src/main.ts');
    assert.doesNotMatch(src, /origin:\s*'\*'/);
    assert.match(src, /credentials:\s*true/);
  });
});
