import { roleLabels, type WorkspaceRole } from '@/navigation/roles';

type UserMenuProps = {
  role: WorkspaceRole;
};

export function UserMenu({ role }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-panel px-3 py-2">
      <div aria-hidden="true" className="h-8 w-8 rounded-full bg-accent text-center text-sm font-bold leading-8 text-white">
        M
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">MAOS User</p>
        <p className="text-xs text-slate-500">{roleLabels[role]}</p>
      </div>
    </div>
  );
}
