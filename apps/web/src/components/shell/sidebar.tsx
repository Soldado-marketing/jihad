import Link from 'next/link';
import { filterNavigationItems } from '@/security/ui-permissions';
import { workspaceNavigation } from '@/navigation/navigation';
import type { WorkspaceRole } from '@/navigation/roles';
import { cn } from '@/lib/class-names';

type SidebarProps = {
  role: WorkspaceRole;
};

export function Sidebar({ role }: SidebarProps) {
  const items = filterNavigationItems(role, workspaceNavigation);

  return (
    <aside
      aria-label="Primary workspace navigation"
      className="w-full max-w-full overflow-hidden border-b border-line bg-panel/95 text-ink shadow-card backdrop-blur md:sticky md:top-0 md:min-h-screen md:w-72 md:border-b-0 md:border-e"
    >
      <div className="border-b border-line px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-sm font-bold text-white">
            M
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight">MAOS</p>
            <p className="mt-0.5 text-xs text-muted">Marketing Agency OS</p>
          </div>
        </div>
        <p className="mt-4 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800">
          Owner workspace preview
        </p>
      </div>
      <nav className="flex max-w-full gap-1 overflow-x-auto p-3 md:block md:space-y-1" aria-label="Workspace">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'block whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700',
              'hover:bg-slate-100 hover:text-ink focus-visible:bg-slate-100',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
