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
  return 'Whole workspace, limited by role permissions';
}
