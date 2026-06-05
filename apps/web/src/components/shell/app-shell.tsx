import type { ReactNode } from 'react';
import { getDirection, getDirectionalClass, type SupportedLocale } from '@/i18n/direction';
import type { WorkspaceRole } from '@/navigation/roles';
import { cn } from '@/lib/class-names';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { WorkspaceContent } from './workspace-content';

type AppShellProps = {
  children: ReactNode;
  locale?: SupportedLocale;
  role?: WorkspaceRole;
};

export function AppShell({ children, locale = 'en', role = 'OWNER' }: AppShellProps) {
  return (
    <div
      className={cn('min-h-screen bg-canvas text-ink md:flex', getDirectionalClass(locale))}
      data-app-shell
      dir={getDirection(locale)}
      lang={locale}
    >
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar locale={locale} role={role} />
        <WorkspaceContent>{children}</WorkspaceContent>
      </div>
    </div>
  );
}
