/**
 * HTTP security headers for every web route (MAOS-T33).
 *
 * The Content Security Policy is sent as Report-Only first: Next.js injects
 * inline hydration scripts, so an enforced policy needs per-request nonces
 * (middleware) before 'unsafe-inline' can be dropped. Report-Only lets the
 * policy be observed in browsers without breaking pages. Framing is still
 * blocked for real through X-Frame-Options.
 *
 * Plain TypeScript without enums or decorators so Node can load it directly
 * in tests.
 */

export interface SecurityHeader {
  key: string;
  value: string;
}

/** Origin of the API for connect-src; null when same-origin or unusable. */
function apiOrigin(apiUrl: string | undefined): string | null {
  if (!apiUrl || !/^https?:\/\//.test(apiUrl)) return null;
  try {
    return new URL(apiUrl).origin;
  } catch {
    return null;
  }
}

export function buildSecurityHeaders(apiUrl: string | undefined): SecurityHeader[] {
  const origin = apiOrigin(apiUrl);
  const connectSrc = origin ? `'self' ${origin}` : `'self'`;

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `connect-src ${connectSrc}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ');

  return [
    { key: 'Content-Security-Policy-Report-Only', value: `${csp};` },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  ];
}
