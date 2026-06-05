'use client';

import { useState } from 'react';

export function RolePreviewBadge() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        className="w-full rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-start text-xs font-semibold text-teal-800 hover:bg-teal-100 focus-visible:bg-teal-100"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        Owner workspace preview
      </button>
      {open ? (
        <div className="mt-2 rounded-md border border-line bg-white p-3 text-xs leading-5 text-slate-600">
          This local preview is locked to the Owner role. Manager, Employee, and Client
          boundaries are preserved in navigation tests and client portal routes.
        </div>
      ) : null}
    </div>
  );
}
