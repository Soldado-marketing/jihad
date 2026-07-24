/**
 * Security MVP (Stage A) — S-02 frontend refresh flow.
 * Static source-analysis tests. No live server required.
 * Run: node --test test/security-mvp-refresh.test.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(join(webRoot, rel), 'utf8');

const fetchSrc = () => read('src/lib/fetch.ts');
const authSrc = () => read('src/lib/auth.ts');

describe('S-02 — auth.ts token rotation helper', () => {
  it('exposes updateAuthTokens that writes access + refresh tokens', () => {
    const src = authSrc();
    assert.match(src, /export function updateAuthTokens/);
    assert.match(src, /localStorage\.setItem\(KEYS\.ACCESS_TOKEN/);
    assert.match(src, /localStorage\.setItem\(KEYS\.REFRESH_TOKEN/);
  });
});

describe('S-02 — fetch.ts single-flight refresh + retry', () => {
  it('calls the backend /auth/refresh endpoint with the stored refresh token', () => {
    const src = fetchSrc();
    assert.match(src, /\/auth\/refresh/);
    assert.match(src, /getRefreshToken\(\)/);
    assert.match(src, /body:\s*JSON\.stringify\(\{\s*refreshToken\s*\}\)/);
  });

  it('uses a shared in-flight promise so concurrent 401s trigger one refresh', () => {
    const src = fetchSrc();
    assert.match(src, /let refreshInFlight/);
    assert.match(src, /refreshInFlight\s*=\s*performRefresh\(\)/);
  });

  it('attempts refresh + retry only once, guarded against auth-path recursion', () => {
    const src = fetchSrc();
    assert.match(src, /res\.status === 401 && !isAuthPath\(path\)/);
    assert.match(src, /const newToken = await refreshOnce\(\)/);
    assert.match(src, /res = await runRequest\(newToken\)/);
  });

  it('skips refresh for auth endpoints (login/register/refresh/bootstrap)', () => {
    const src = fetchSrc();
    assert.match(src, /AUTH_PATHS\s*=\s*\[[^\]]*'\/auth\/login'[^\]]*'\/auth\/refresh'/s);
    assert.match(src, /function isAuthPath/);
  });

  it('rotates stored tokens on success and clears the session on failed refresh', () => {
    const src = fetchSrc();
    assert.match(src, /updateAuthTokens\(data\.accessToken,\s*data\.refreshToken\)/);
    assert.match(src, /clearAuthSession\(\)/);
    assert.match(src, /window\.location\.assign\('\/auth\/login'\)/);
  });
});
