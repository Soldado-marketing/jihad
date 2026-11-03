/**
 * One member's access history (plan row E02): what the OWNER reads under a
 * member on the team page. Pure wording over the audit details the API
 * returns; the API decides who may read it (OWNER only).
 */

export type MemberHistoryItem = {
  id: string;
  action: string;
  outcome: string;
  createdAt: string;
  actor: { id: string; displayName: string | null } | null;
  details: Record<string, unknown> | null;
};

export const GRANT_LABEL: Record<string, string> = {
  'decide-approvals': 'Decides approvals',
  'invoices-read': 'Views invoices',
  'invoices-edit': 'Creates and sends invoices',
  'payments-record': 'Records payments',
  'all-tasks': 'Sees all tasks',
};

// Kept local (no import) so plain node tests can load this file without a bundler.
const ROLE_LABEL: Record<string, string> = { OWNER: 'Owner', MANAGER: 'Manager', EMPLOYEE: 'Employee', CONTRACTOR: 'Contractor', CLIENT: 'Client' };
const roleLabel = (role: unknown): string => (typeof role === 'string' ? (ROLE_LABEL[role] ?? role) : '');

/** The one-line detail under a history entry, or '' when there is nothing to add. */
export function historyDetail(action: string, details: Record<string, unknown> | null | undefined): string {
  const d = details ?? {};
  switch (action) {
    case 'role.changed': {
      const from = roleLabel(d.previousRole);
      const to = roleLabel(d.newRole);
      return from && to ? `${from} → ${to}` : to ? `Now ${to}` : '';
    }
    case 'role.assigned':
      return d.role ? `Joined as ${roleLabel(d.role)}` : '';
    case 'membership.grant_updated': {
      const grant = typeof d.grant === 'string' ? (GRANT_LABEL[d.grant] ?? d.grant) : '';
      return grant ? `${grant}: ${d.enabled ? 'on' : 'off'}` : '';
    }
    case 'membership.removed':
      return d.role ? `Was ${roleLabel(d.role)}` : '';
    case 'scope.assigned':
      return d.clientScopeKey ? 'Client scope set' : typeof d.visibilityScope === 'string' ? `Scope ${d.visibilityScope.toLowerCase().replace(/_/g, ' ')}` : '';
    default:
      return '';
  }
}

/** Who did it, in words the page can show (never an id). */
export function historyActor(actor: MemberHistoryItem['actor']): string {
  return actor?.displayName?.trim() || 'System';
}
