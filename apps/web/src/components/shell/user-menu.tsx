'use client';

import { useState } from 'react';
import { roleLabels, type WorkspaceRole } from '@/navigation/roles';

type UserMenuProps = {
  role: WorkspaceRole;
};

export function UserMenu({ role }: UserMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="flex items-center gap-3 rounded-md border border-line bg-white px-3 py-2 text-start shadow-[0_12px_30px_-26px_rgba(15,23,42,0.7)] hover:bg-slate-50 focus-visible:bg-slate-50"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <div aria-hidden="true" className="h-8 w-8 rounded-full bg-accent text-center text-sm font-bold leading-8 text-white shadow-sm">
          M
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">MAOS User</p>
          <p className="text-xs text-slate-500">{roleLabels[role]}</p>
        </div>
      </button>
      {open ? (
        <div className="absolute end-0 z-20 mt-2 w-64 rounded-md border border-line bg-white p-3 text-sm shadow-card">
          <p className="font-semibold text-ink">Preview account</p>
          <p className="mt-1 text-slate-600">Role: {roleLabels[role]}</p>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Authentication is still placeholder-only in local preview. Live account
            behavior starts after API and database staging are connected.
          </p>
        </div>
      ) : null}
    </div>
  );
}
