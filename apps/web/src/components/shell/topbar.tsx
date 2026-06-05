import { getApiHealthReference } from '@/api/health';
import type { SupportedLocale } from '@/i18n/direction';
import type { WorkspaceRole } from '@/navigation/roles';
import { UserMenu } from './user-menu';

type TopbarProps = {
  locale: SupportedLocale;
  role: WorkspaceRole;
};

export function Topbar({ locale, role }: TopbarProps) {
  const apiHealth = getApiHealthReference();

  return (
    <header className="sticky top-0 z-10 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line bg-white/85 px-4 py-3 shadow-[0_10px_30px_-28px_rgba(15,23,42,0.6)] backdrop-blur sm:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">MAOS MVP</p>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Codex Marketing Platform</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Local preview
        </div>
        <div className="rounded-md border border-line bg-white px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold">Locale:</span> {locale.toUpperCase()}
        </div>
        <div className="rounded-md border border-line bg-white px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold">API:</span> {apiHealth.method} /api/health
        </div>
        <UserMenu role={role} />
      </div>
    </header>
  );
}
