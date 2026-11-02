'use client';
import { CompanySwitcher } from '@/components/shell/company-switcher';
import { UserMenu } from '@/components/shell/user-menu';
import { NotificationBell } from '@/components/notifications/notification-bell';

export function ClientTopbar() {
  return (
    <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-line bg-white/90 px-4 py-3 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.7)] backdrop-blur sm:px-6">
      <div className="min-w-0">
        <CompanySwitcher />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <NotificationBell portal="client" />
        <UserMenu role="CLIENT" />
      </div>
    </header>
  );
}
