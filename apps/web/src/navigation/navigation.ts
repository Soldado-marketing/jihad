import type { WorkspaceRole } from './roles';

export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  allowedRoles: WorkspaceRole[];
  sprint2Status: 'active' | 'placeholder' | 'deferred';
  clientSafe: boolean;
};

/**
 * Workspace navigation — all active modules shown based on role.
 */
export const workspaceNavigation: NavigationItem[] = [
  // ── Core ────────────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    allowedRoles: ['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    // Owner Control Center: every company the user owns, read-only overview.
    id: 'control-center',
    label: 'All my companies',
    href: '/control-center',
    allowedRoles: ['OWNER'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    id: 'my-work',
    label: 'My Work',
    href: '/my-work',
    allowedRoles: ['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    href: '/calendar',
    allowedRoles: ['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  // ── Admin (Owner only) ───────────────────────────────────────────────────
  {
    id: 'company-access',
    label: 'Company Access',
    href: '/dashboard/admin/company-access',
    allowedRoles: ['OWNER'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    id: 'admin-users',
    label: 'User Requests',
    href: '/dashboard/admin/users/requests',
    allowedRoles: ['OWNER'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    id: 'admin-invites',
    label: 'Invitations',
    href: '/dashboard/admin/invites',
    allowedRoles: ['OWNER'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    id: 'audit',
    label: 'Audit Log',
    href: '/audit',
    allowedRoles: ['OWNER'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  // ── Delivery ────────────────────────────────────────────────────────────
  {
    id: 'projects',
    label: 'Projects',
    href: '/projects',
    allowedRoles: ['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    href: '/tasks',
    allowedRoles: ['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  // ── Sales ───────────────────────────────────────────────────────────────
  {
    id: 'customers',
    label: 'Customers',
    href: '/customers',
    allowedRoles: ['OWNER', 'MANAGER', 'EMPLOYEE'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    id: 'crm',
    label: 'CRM',
    href: '/crm',
    allowedRoles: ['OWNER', 'MANAGER'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    id: 'time',
    label: 'Time & Costs',
    href: '/time',
    allowedRoles: ['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  // ── Data ────────────────────────────────────────────────────────────────
  {
    id: 'data',
    label: 'Import & export',
    href: '/data',
    allowedRoles: ['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  // ── Account ─────────────────────────────────────────────────────────────
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    allowedRoles: ['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  // ── Team ────────────────────────────────────────────────────────────────
  {
    id: 'collaboration',
    label: 'Collaboration',
    href: '/collaboration',
    allowedRoles: ['OWNER', 'MANAGER', 'EMPLOYEE'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    id: 'chat',
    label: 'Chat',
    href: '/chat',
    allowedRoles: ['OWNER', 'MANAGER', 'EMPLOYEE'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    href: '/notifications',
    allowedRoles: ['OWNER', 'MANAGER', 'EMPLOYEE'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  // ── Operations ────────────────────────────────────────────────────────────
  {
    id: 'voice',
    label: 'Voice Notes',
    href: '/voice',
    allowedRoles: ['OWNER', 'MANAGER', 'EMPLOYEE'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    id: 'finance',
    label: 'Finance',
    href: '/finance',
    allowedRoles: ['OWNER'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    allowedRoles: ['OWNER', 'MANAGER'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    id: 'files',
    label: 'Files',
    href: '/files',
    allowedRoles: ['OWNER', 'MANAGER', 'EMPLOYEE'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    id: 'approvals',
    label: 'Approvals',
    href: '/approvals',
    allowedRoles: ['OWNER', 'MANAGER', 'EMPLOYEE'],
    sprint2Status: 'active',
    clientSafe: false,
  },
  {
    id: 'client-placeholder',
    label: 'Client workspace',
    href: '#client-portal-deferred',
    allowedRoles: ['CLIENT'],
    sprint2Status: 'deferred',
    clientSafe: true,
  },
];

export function getNavigationForRole(role: WorkspaceRole): NavigationItem[] {
  return workspaceNavigation.filter(
    (item) => item.allowedRoles.includes(role) && item.sprint2Status !== 'deferred',
  );
}
