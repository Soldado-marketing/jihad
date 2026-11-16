/**
 * When does this access token stop being accepted? (MAOS C09)
 *
 * Read-only look at the `exp` claim of a JWT so a request that is expensive to
 * repeat — an upload — can renew the token before it is sent instead of after
 * a 401. This is never an access decision: the server alone decides whether a
 * token is valid. Anything that cannot be read gives `null`, and the caller
 * then behaves exactly as if this check did not exist.
 */

/** Seconds of margin: a token this close to its end is renewed first. */
export const EXPIRY_MARGIN_SECONDS = 30;

/** The `exp` claim in milliseconds since the epoch, or null when the token cannot be read. */
export function accessTokenExpiresAt(token: string | null | undefined): number | null {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const claims: unknown = JSON.parse(atob(padded));
    const exp = (claims as { exp?: unknown } | null)?.exp;
    return typeof exp === 'number' && Number.isFinite(exp) && exp > 0 ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * True only when the token says it has ended, or ends within the margin.
 * An unreadable token is not "expired": nothing is known, so nothing changes.
 */
export function accessTokenHasExpired(
  token: string | null | undefined,
  nowMs: number = Date.now(),
  marginSeconds: number = EXPIRY_MARGIN_SECONDS,
): boolean {
  const expiresAt = accessTokenExpiresAt(token);
  return expiresAt !== null && expiresAt - marginSeconds * 1000 <= nowMs;
}
