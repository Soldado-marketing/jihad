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
 *   - invoices-read: a MANAGER may list, open and download invoices.
 *   - invoices-edit: a MANAGER may also create invoices, change their status
 *     and send them (includes invoices-read).
 *   - payments-record: a MANAGER may record a payment on an invoice (includes
 *     invoices-read). Reading the payment ledger stays OWNER-only (sensitive).
 *     Managers have no invoice or payment access by default.
 *   - all-tasks: an EMPLOYEE sees every task of the company. Without it an
 *     employee sees tasks assigned to them and tasks of projects they are a
 *     member of (ResourceScopeService).
 */
export const EXPLICIT_GRANTS = {
  'decide-approvals': {
    rows: [{ action: 'decide', resource: 'approval' }],
    roles: [MembershipRole.MANAGER, MembershipRole.EMPLOYEE],
  },
  'invoices-read': {
    rows: [{ action: 'read', resource: 'invoice' }],
    roles: [MembershipRole.MANAGER],
  },
  'invoices-edit': {
    rows: [
      { action: 'read', resource: 'invoice' },
      { action: 'create', resource: 'invoice' },
      { action: 'update', resource: 'invoice' },
    ],
    roles: [MembershipRole.MANAGER],
  },
  'payments-record': {
    rows: [
      { action: 'read', resource: 'invoice' },
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

/**
 * Marker row recording that the OWNER switched a grant on. Grants share rows
 * (invoice read belongs to three), so the rows alone cannot tell which grant
 * was given. The marker matches no route requirement; guards use the rows.
 */
export const grantMarker = (grant: ExplicitGrant) => ({ action: 'grant', resource: grant });

/** True when the OWNER gave the grant (marker) and every row it needs is granted. */
export function hasGrant(
  permissions: { action: string; resource: string; granted: boolean }[],
  grant: ExplicitGrant,
): boolean {
  return [grantMarker(grant), ...EXPLICIT_GRANTS[grant].rows].every((row) =>
    permissions.some((p) => p.action === row.action && p.resource === row.resource && p.granted));
}

type Row = { action: string; resource: string };
const same = (a: Row, b: Row) => a.action === b.action && a.resource === b.resource;

/**
 * The rows to write when `grant` is switched on or off. Grants share rows
 * (invoice read is part of three of them), so a row stays granted while any
 * other grant the member keeps still needs it: removing "edit" keeps "read"
 * for a member who also holds "invoices-read".
 */
export function rowsAfterChange(
  permissions: { action: string; resource: string; granted: boolean }[],
  role: string,
  grant: ExplicitGrant,
  enabled: boolean,
): { action: string; resource: string; granted: boolean }[] {
  const kept = EXPLICIT_GRANT_KEYS.filter((g) => g !== grant
    && (EXPLICIT_GRANTS[g].roles as readonly string[]).includes(role)
    && hasGrant(permissions, g));
  const active = enabled ? [...kept, grant] : kept;
  return [
    { ...grantMarker(grant), granted: enabled },
    ...EXPLICIT_GRANTS[grant].rows.map((row) => ({
      ...row,
      granted: active.some((g) => EXPLICIT_GRANTS[g].rows.some((r) => same(r, row))),
    })),
  ];
}
