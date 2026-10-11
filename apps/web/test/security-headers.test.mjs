/**
 * Web security headers (MAOS-T33).
 * Run: node --test test/security-headers.test.mjs
 *
 * The web app sent no security headers. These tests check the header set
 * built by src/security/security-headers.ts and that next.config.ts applies
 * it to every route. The served headers of a production build are checked
 * separately (see the PR).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildSecurityHeaders } from '../src/security/security-headers.ts';

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const asMap = (headers) => Object.fromEntries(headers.map((h) => [h.key, h.value]));

describe('security headers', () => {
  const h = asMap(buildSecurityHeaders('https://api.example.com/'));

  it('forbids framing, MIME sniffing and leaking full referrers', () => {
    assert.equal(h['X-Frame-Options'], 'DENY');
    assert.equal(h['X-Content-Type-Options'], 'nosniff');
    assert.equal(h['Referrer-Policy'], 'strict-origin-when-cross-origin');
  });

  it('denies camera, microphone and geolocation (not used by MAOS)', () => {
    for (const feature of ['camera=()', 'microphone=()', 'geolocation=()']) {
      assert.ok(h['Permissions-Policy'].includes(feature), feature);
    }
  });

  it('sends HSTS for one year with subdomains and without preload', () => {
    const hsts = h['Strict-Transport-Security'];
    assert.match(hsts, /max-age=31536000/);
    assert.match(hsts, /includeSubDomains/);
    assert.doesNotMatch(hsts, /preload/);
  });

  it('ships the CSP in report-only mode first (Next.js inline scripts need nonces before enforcing)', () => {
    assert.equal(h['Content-Security-Policy'], undefined);
    const csp = h['Content-Security-Policy-Report-Only'];
    for (const directive of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"]) {
      assert.ok(csp.includes(directive), directive);
    }
  });

  it("allows the API origin (origin only, no path) in connect-src", () => {
    const csp = asMap(buildSecurityHeaders('https://api.example.com/api/'))['Content-Security-Policy-Report-Only'];
    assert.match(csp, /connect-src 'self' https:\/\/api\.example\.com;/);
  });

  it("keeps connect-src to 'self' for a same-origin or unusable API URL", () => {
    for (const url of ['/api', '', undefined, 'not a url']) {
      const csp = asMap(buildSecurityHeaders(url))['Content-Security-Policy-Report-Only'];
      assert.match(csp, /connect-src 'self';/, String(url));
    }
  });

  it('is applied to every route by next.config.ts', () => {
    const config = readFileSync(join(webRoot, 'next.config.ts'), 'utf8');
    assert.match(config, /buildSecurityHeaders\(/);
    assert.match(config, /source: '\/:path\*'/);
  });
});
