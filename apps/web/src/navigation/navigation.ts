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
  // ── Admin (Owner only) ───────────────────────────────────────────────────
  {
    id: 'admin-users',
    label: 'User Requests',
    href: '/dashboard/admin/users/requests',
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
    id: 'crm',
    label: 'CRM',
    href: '/crm',
    allowedRoles: ['OWNER', 'MANAGER'],
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
