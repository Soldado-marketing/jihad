'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ClientShell } from '@/components/client-portal/client-shell';
import { getStoredUser, isAuthenticated, watchTenantSessionChanges } from '@/lib/auth';

/** Roles the portal serves: the client, and the two roles whose internal view is already company-wide. */
const PORTAL_ROLES = new Set(['CLIENT', 'OWNER', 'MANAGER']);

export default function ClientLayout({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    // An EMPLOYEE or CONTRACTOR works inside their assigned scope; the portal
    // is not theirs (the API refuses them too: portal_requires_client_scope).
    const role = getStoredUser()?.role;
    if (role && !PORTAL_ROLES.has(role)) {
      router.replace('/dashboard');
      return;
    }
    setChecked(true);
    return watchTenantSessionChanges();
  }, [router]);

  if (!checked) return null;

  return <ClientShell>{children}</ClientShell>;
}
