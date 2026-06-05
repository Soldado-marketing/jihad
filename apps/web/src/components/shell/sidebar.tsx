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
      className="w-full border-b border-line bg-ink text-white md:min-h-screen md:w-64 md:border-b-0 md:border-e"
    >
      <div className="border-b border-white/10 px-4 py-5">
        <p className="text-lg font-semibold">MAOS</p>
        <p className="mt-1 text-xs text-white/70">Marketing Agency OS</p>
        <p className="mt-3 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white/80">
          Owner workspace preview
        </p>
      </div>
      <nav className="flex gap-1 overflow-x-auto p-3 md:block" aria-label="Workspace">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-white/82',
              'hover:bg-white/10 focus-visible:bg-white/10',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
