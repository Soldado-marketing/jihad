/**
 * Invite flow helpers (MAOS F-2). Pure, so the contract is tested without a
 * browser: which roles can be invited, which tokens are worth sending to the
 * API, and what the acceptance form refuses before it is submitted.
 */

/** OWNER is never invitable; CLIENT waits for a gated migration (client scope on the invite). */
export const INVITE_ROLES = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'CONTRACTOR', label: 'Contractor' },
] as const;

export type InviteRole = (typeof INVITE_ROLES)[number]['value'];
export type InviteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

/** The link lifetime the API enforces (INVITE_TTL_HOURS in apps/api). */
export const INVITE_TTL_HOURS = 72;

/** Same shape the API accepts: 32 random bytes in base64url. */
export function isInviteToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
}

export interface AcceptForm {
  fullName: string;
  password: string;
  confirm: string;
}

/** The registration rules for name and password, plus a matching confirmation. */
export function acceptFormError(form: AcceptForm): string | null {
  const name = form.fullName.trim();
  if (name.length < 2 || name.length > 100) return 'Enter your full name (2 to 100 characters).';
  if (form.password.length < 8 || form.password.length > 128) return 'The password needs 8 to 128 characters.';
  if (form.password !== form.confirm) return 'The passwords do not match.';
  return null;
}

export const INVITE_STATUS_LABEL: Record<InviteStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Open',
  ACCEPTED: 'Accepted',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};

/** Only an open invite can be revoked; the API answers 404 for anything else. */
export function canRevoke(status: InviteStatus): boolean {
  return status === 'SENT';
}

/** The one message for every unusable link, matching the API's INVITE_INVALID. */
export const INVALID_INVITE_MESSAGE = 'This invitation is invalid or has expired. Ask your administrator for a new one.';
