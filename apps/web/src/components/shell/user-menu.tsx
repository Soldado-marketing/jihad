import { roleLabels, type WorkspaceRole } from '@/navigation/roles';

type UserMenuProps = {
  role: WorkspaceRole;
};

export function UserMenu({ role }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-white px-3 py-2 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.7)]">
      <div aria-hidden="true" className="h-8 w-8 rounded-full bg-accent text-center text-sm font-bold leading-8 text-white shadow-sm">
        M
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">MAOS User</p>
        <p className="text-xs text-slate-500">{roleLabels[role]}</p>
      </div>
    </div>
  );
}
