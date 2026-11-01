'use client';
import { CompanySwitcher } from '@/components/shell/company-switcher';
import { UserMenu } from '@/components/shell/user-menu';

export function ClientTopbar() {
  return (
    <header className="sticky top-0 z-10 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line bg-white/90 px-4 py-3 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.7)] backdrop-blur sm:px-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
          Client portal
        </p>
        <h1 className="text-xl font-semibold text-ink">Client workspace</h1>
      </div>
      <div className="flex min-w-0 max-w-full items-center gap-3">
        <CompanySwitcher />
        <span className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-slate-700">Client-safe view</span>
        <UserMenu role="CLIENT" />
      </div>
    </header>
  );
}
