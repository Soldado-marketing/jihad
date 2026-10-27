'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { getApiHealthReference } from '@/api/health';
import type { SupportedLocale } from '@/i18n/direction';
import type { WorkspaceRole } from '@/navigation/roles';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { CommandPalette } from './command-palette';
import { TopbarActions } from './topbar-actions';
import { UserMenu } from './user-menu';
import { CompanySwitcher } from './company-switcher';

type TopbarProps = {
  locale: SupportedLocale;
  role: WorkspaceRole;
};

export function Topbar({ locale, role }: TopbarProps) {
  const reduced = useReducedMotion();
  const apiHealth = getApiHealthReference();

  return (
    <motion.header
      className="sticky top-0 z-10 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line bg-white/90 px-4 py-3 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.7)] backdrop-blur sm:px-6"
      initial={reduced ? false as const : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.25, ease: [0.0, 0.0, 0.2, 1] }}
    >
      <CompanySwitcher />
      <div className="flex flex-wrap items-center gap-3">
        <TopbarActions apiHealth={apiHealth} locale={locale} />
        <CommandPalette role={role} />
        <NotificationBell />
        <UserMenu role={role} />
      </div>
    </motion.header>
  );
}
