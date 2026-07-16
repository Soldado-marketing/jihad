'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { roleLabels, type WorkspaceRole } from '@/navigation/roles';
import { clearAuthSession, getStoredUser } from '@/lib/auth';
import { apiBase } from '@/lib/api';

type UserMenuProps = {
  role: WorkspaceRole;
};

export function UserMenu({ role }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>('Account');
  const [email, setEmail] = useState<string>('');
  const [avatarChar, setAvatarChar] = useState('M');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setDisplayName(user.displayName || user.email.split('@')[0]);
      setEmail(user.email);
      setAvatarChar((user.displayName || user.email).charAt(0).toUpperCase());
    }
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      const token = localStorage.getItem('maos_access_token');
      if (token) {
        await fetch(`${apiBase()}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {
          // Best-effort — clear locally even if API call fails
        });
      }
    } finally {
      clearAuthSession();
      router.push('/auth/login');
    }
  }

  return (
    <div className="relative">
      <button
        className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 text-start shadow-[0_12px_30px_-26px_rgba(15,23,42,0.7)] hover:bg-slate-50 focus-visible:bg-slate-50"
        onClick={() => setOpen((value) => !value)}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div aria-hidden="true" className="h-8 w-8 rounded-full bg-accent text-center text-sm font-bold leading-8 text-white shadow-sm">
          {avatarChar}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
          <p className="text-xs text-slate-500">{roleLabels[role] ?? role}</p>
        </div>
      </button>
      {open ? (
        <div className="absolute end-0 z-20 mt-2 w-72 rounded-xl border border-line bg-white p-4 text-sm shadow-card">
          <p className="font-semibold text-ink">{displayName}</p>
          {email && <p className="mt-0.5 truncate text-xs text-slate-500">{email}</p>}
          <p className="mt-1 text-slate-600">Role: {roleLabels[role] ?? role}</p>
          <hr className="my-3 border-line" />
          <button
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            className="w-full rounded-lg bg-destructive/10 px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
            type="button"
          >
            {isLoggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
