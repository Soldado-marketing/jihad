import { MembershipRole } from '../../common/identity/membership-role';

/**
 * Access an OWNER grants a member explicitly, per company, as existing
 * MembershipPermission rows (no schema change). Each grant is one or more
 * (action, resource) rows; PermissionService.decide already gives a matching
 * row precedence over role defaults, so guarded routes need nothing extra.
 *
 *   - decide-approvals: may approve, reject or request changes. Without it only
 *     the OWNER decides. Checked by the approvals service, not the guard,
 *     because requesting an approval uses the same CREATE permission.
 *   - invoices: a MANAGER may read, create and update invoices and record
 *     payments. Managers have no invoice access by default.
 *   - all-tasks: an EMPLOYEE sees every task of the company. Without it an
 *     employee sees tasks assigned to them and tasks of projects they are a
 *     member of (ResourceScopeService).
 */
export const EXPLICIT_GRANTS = {
  'decide-approvals': {
    rows: [{ action: 'decide', resource: 'approval' }],
    roles: [MembershipRole.MANAGER, MembershipRole.EMPLOYEE],
  },
  invoices: {
    rows: [
      { action: 'read', resource: 'invoice' },
      { action: 'create', resource: 'invoice' },
      { action: 'update', resource: 'invoice' },
      { action: 'create', resource: 'payment' },
    ],
    roles: [MembershipRole.MANAGER],
  },
  'all-tasks': {
    rows: [{ action: 'read-all', resource: 'task' }],
    roles: [MembershipRole.EMPLOYEE],
  },
} as const;

export type ExplicitGrant = keyof typeof EXPLICIT_GRANTS;
export const EXPLICIT_GRANT_KEYS = Object.keys(EXPLICIT_GRANTS) as ExplicitGrant[];

/** True when every row of the grant is present and granted. */
export function hasGrant(
  permissions: { action: string; resource: string; granted: boolean }[],
  grant: ExplicitGrant,
): boolean {
  return EXPLICIT_GRANTS[grant].rows.every((row) =>
    permissions.some((p) => p.action === row.action && p.resource === row.resource && p.granted));
}
