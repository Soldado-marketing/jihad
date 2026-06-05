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
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line bg-panel px-4 py-3 sm:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">MAOS MVP</p>
        <h1 className="text-xl font-semibold text-ink">Codex Marketing Platform</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Local preview
        </div>
        <div className="rounded-md border border-line px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold">Locale:</span> {locale.toUpperCase()}
        </div>
        <div className="rounded-md border border-line px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold">API:</span> {apiHealth.method} /api/health
        </div>
        <UserMenu role={role} />
      </div>
    </header>
  );
}
