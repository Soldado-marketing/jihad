/**
 * The data access a role actually has (MAOS-T36).
 *
 * The backend enforces no per-user visibility scope: internal roles see by
 * role across the workspace, and a client sees only its own client's data.
 * The UI states exactly that, and offers no choice that would imply a
 * restriction the backend does not provide.
 */
export function effectiveAccessLabel(role: string | null | undefined): string {
  if (role === 'CLIENT') return 'Own client only (client portal)';
  // MAOS-T35: contractors see only the work they are assigned to.
  if (role === 'CONTRACTOR') return 'Assigned projects, tasks and files only';
  return 'Whole workspace, limited by role permissions';
}

/**
 * Format of a client key, the same rule the backend enforces (F-1): it ties a
 * CLIENT to its own client's projects, files and invoices.
 */
export const CLIENT_SCOPE_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

/**
 * The client-key part of an approve or role-change request. A CLIENT must have
 * a valid key (null = not ready to submit); every other role sends none.
 */
export function clientScopeKeyPayload(
  role: string,
  key: string,
): { clientScopeKey?: string } | null {
  if (role !== 'CLIENT') return {};
  const trimmed = key.trim();
  return CLIENT_SCOPE_KEY_PATTERN.test(trimmed) ? { clientScopeKey: trimmed } : null;
}
