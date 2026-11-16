/**
 * C09 — the expiry check behind apiUpload's renew-before-send.
 * Run: node --test test/token-expiry.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { accessTokenExpiresAt, accessTokenHasExpired, EXPIRY_MARGIN_SECONDS } from '../src/lib/token-expiry.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = (claims) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(claims)}.signature-not-checked-here`;
const NOW = Date.UTC(2026, 10, 16, 12, 0, 0);
const at = (secondsFromNow) => Math.floor(NOW / 1000) + secondsFromNow;

describe('C09 — reading the end of an access token', () => {
  it('reads exp in milliseconds', () => {
    assert.equal(accessTokenExpiresAt(jwt({ sub: 'u', exp: at(900) })), NOW + 900_000);
  });

  it('reads payloads whose base64url needs padding or uses - and _', () => {
    for (const sub of ['a', 'ab', 'abc', 'abcd', '~~~???>>>']) {
      assert.equal(accessTokenExpiresAt(jwt({ sub, exp: at(60) })), NOW + 60_000, sub);
    }
  });

  it('gives null for anything it cannot read', () => {
    for (const bad of [null, undefined, '', 'not-a-token', 'a.b', 'a.b.c.d', 'a..c', `x.${b64url('text')}.y`, `x.${b64url({ sub: 'u' })}.y`,
      `x.${b64url({ exp: 'soon' })}.y`, `x.${b64url({ exp: 0 })}.y`, `x.${b64url({ exp: -5 })}.y`, 'x.%%%.y', 42, {}]) {
      assert.equal(accessTokenExpiresAt(bad), null, String(bad));
    }
  });
});

describe('C09 — has the token expired?', () => {
  it('a token with time left has not expired', () => {
    assert.equal(accessTokenHasExpired(jwt({ exp: at(900) }), NOW), false);
    assert.equal(accessTokenHasExpired(jwt({ exp: at(EXPIRY_MARGIN_SECONDS + 1) }), NOW), false);
  });

  it('a token past its end, or within the margin of it, has expired', () => {
    assert.equal(accessTokenHasExpired(jwt({ exp: at(-1) }), NOW), true);
    assert.equal(accessTokenHasExpired(jwt({ exp: at(-86_400) }), NOW), true);
    assert.equal(accessTokenHasExpired(jwt({ exp: at(0) }), NOW), true);
    assert.equal(accessTokenHasExpired(jwt({ exp: at(EXPIRY_MARGIN_SECONDS) }), NOW), true);
    assert.equal(accessTokenHasExpired(jwt({ exp: at(5) }), NOW), true);
  });

  it('an unreadable or missing token is never reported as expired', () => {
    for (const unknown of [null, undefined, '', 'garbage', 'a.b.c', `x.${b64url({ sub: 'u' })}.y`]) {
      assert.equal(accessTokenHasExpired(unknown, NOW), false, String(unknown));
    }
  });

  it('the margin is small and can be set', () => {
    assert.equal(EXPIRY_MARGIN_SECONDS, 30);
    assert.equal(accessTokenHasExpired(jwt({ exp: at(20) }), NOW, 0), false);
    assert.equal(accessTokenHasExpired(jwt({ exp: at(20) }), NOW, 60), true);
  });
});

describe('C09 — apiUpload renews before it sends', () => {
  const src = readFileSync(join(root, 'src/lib/fetch.ts'), 'utf8');
  const upload = src.slice(src.indexOf('export function apiUpload'), src.indexOf('export interface BinaryResponse'));

  it('checks the stored token and renews it before the first send', () => {
    const check = upload.indexOf('accessTokenHasExpired(');
    const renew = upload.indexOf('refreshOnce()', check);
    const firstSend = upload.indexOf('await send(', check);
    assert.ok(check > 0, 'apiUpload must look at the token before sending');
    assert.ok(renew > check && renew < firstSend, 'the renewal must come before the first send');
  });

  it('keeps the old path after a 401 (renew once, send once more, then sign out)', () => {
    assert.match(upload, /if \(res\.status === 401 && typeof window !== 'undefined'\) \{\s*const newToken = await refreshOnce\(\);/);
    assert.match(upload, /throw new UploadFailedError\(401, SESSION_EXPIRED_MESSAGE\)/);
  });

  it('falls back to the stored token when the renewal gives nothing', () => {
    assert.match(upload, /\(await refreshOnce\(\)\) \?\? token/);
  });

  it('leaves apiFetch and apiBlob without the pre-check: their retry costs nothing', () => {
    const rest = src.replace(upload, '');
    assert.equal(rest.includes('accessTokenHasExpired('), false);
  });
});
