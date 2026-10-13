import { createHash, randomBytes } from 'crypto';

/**
 * Invite tokens (MAOS F-2). 32 random bytes, base64url in the link; only the
 * sha256 is stored, so a database read never yields a usable token.
 */
export const INVITE_TTL_HOURS = 72;

export function newInviteToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashInviteToken(token) };
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** A plausible token shape; anything else is refused before any lookup. */
export function isInviteTokenShape(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
}
