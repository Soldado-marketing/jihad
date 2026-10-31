'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { filterNavigationItems } from '@/security/ui-permissions';
import { workspaceNavigation, type NavigationItem } from '@/navigation/navigation';
import type { WorkspaceRole } from '@/navigation/roles';
import { cn } from '@/lib/class-names';
import { useMyGrants, type MyGrants } from '@/lib/my-grants';
import { RolePreviewBadge } from './role-preview-badge';

type SidebarProps = {
  role: WorkspaceRole;
};

export const navGlyphs: Record<string, string> = {
  'admin-invites': 'IN',
  'admin-users': 'AU',
  'company-access': 'CP',
  approvals: 'AP',
  invoices: 'IV',
  audit: 'AL',
  calendar: 'CA',
  chat: 'CH',
  collaboration: 'CO',
  crm: 'CR',
  customers: 'CU',
  dashboard: 'DA',
  files: 'FI',
  finance: 'FN',
  'my-work': 'MW',
  notifications: 'NO',
  projects: 'PR',
  reports: 'RE',
  settings: 'SE',
  tasks: 'TA',
  voice: 'VO',
};

export const navGroups = [
  {
    ids: ['dashboard', 'control-center', 'my-work', 'calendar', 'admin-users', 'admin-invites', 'company-access'],
    label: 'Workspace',
  },
  {
    ids: ['projects', 'tasks', 'time', 'customers', 'crm'],
    label: 'Delivery',
  },
  {
    ids: ['collaboration', 'chat', 'notifications'],
    label: 'Team',
  },
  {
    ids: ['files', 'approvals', 'voice', 'finance', 'invoices', 'reports', 'audit', 'data', 'settings'],
    label: 'Operations',
  },
];

/** The role's permitted navigation items, in the sidebar's groups. Shared with the compact menu. */
export function visibleNavGroups(role: WorkspaceRole, grants: MyGrants = {}) {
  const items = filterNavigationItems(role, workspaceNavigation, grants);
  return navGroups
    .map((group) => ({
      ...group,
      items: items.filter((item) => group.ids.includes(item.id)),
    }))
    .filter((group) => group.items.length > 0);
}

export function isNavItemActive(item: NavigationItem, pathname: string | null): boolean {
  return (
    pathname === item.href ||
    (item.href !== '/dashboard' &&
      item.id !== 'admin-users' &&
      Boolean(pathname?.startsWith(`${item.href}/`))) ||
    (item.id === 'admin-users' && Boolean(pathname?.startsWith('/dashboard/admin/users/')))
  );
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const visibleGroups = visibleNavGroups(role, useMyGrants(role !== 'OWNER' && role !== 'CLIENT'));

  return (
    <motion.aside
      aria-label="Primary workspace navigation"
      className="hidden overflow-hidden bg-navy text-white shadow-shell lg:sticky lg:top-0 lg:block lg:min-h-screen lg:w-72 lg:border-e lg:border-slate-800"
      initial={reduced ? false : { opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.0, 0.0, 0.2, 1] }}
    >
      {/* Logo */}
      <motion.div
        className="border-b border-white/10 px-4 py-5"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.1 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-signal text-sm font-black text-white shadow-lift">
            M
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight">MAOS</p>
            <p className="mt-0.5 text-xs text-slate-300">Soldado Platform</p>
          </div>
        </div>
        <RolePreviewBadge />
      </motion.div>

      {/* Nav */}
      <nav className="space-y-5 p-4" aria-label="Workspace">
        {visibleGroups.map((group, groupIndex) => (
          <motion.div
            key={group.label}
            className="space-y-1"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.25,
              ease: [0.0, 0.0, 0.2, 1],
              delay: reduced ? 0 : 0.12 + groupIndex * 0.06,
            }}
          >
            <p className="px-3 pb-2 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-slate-500">
              {group.label}
            </p>
            {group.items.map((item, itemIndex) => {
              const isActive = isNavItemActive(item, pathname);

              return (
                <motion.div
                  key={item.id}
                  initial={reduced ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.2,
                    ease: [0.0, 0.0, 0.2, 1],
                    delay: reduced ? 0 : 0.16 + groupIndex * 0.06 + itemIndex * 0.03,
                  }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150',
                      isActive
                        ? 'bg-white text-navy shadow-lift'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white hover:translate-x-0.5 focus-visible:bg-white/10',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[0.62rem] font-black transition-transform duration-150',
                        isActive ? 'bg-accent text-white' : 'bg-white/10 text-slate-200',
                      )}
                    >
                      {navGlyphs[item.id] ?? item.label.slice(0, 2).toUpperCase()}
                    </span>
                    <span>{item.label}</span>
                    {/* Active indicator pill */}
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-indicator"
                        className="ms-auto h-1.5 w-1.5 rounded-full bg-accent"
                        transition={{ duration: 0.2, ease: [0.34, 1.2, 0.64, 1] }}
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        ))}
      </nav>
    </motion.aside>
  );
}
