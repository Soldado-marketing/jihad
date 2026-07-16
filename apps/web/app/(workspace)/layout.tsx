'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { getStoredUser, isAuthenticated } from '@/lib/auth';
import type { WorkspaceRole } from '@/navigation/roles';

const VALID_ROLES: WorkspaceRole[] = ['OWNER', 'MANAGER', 'EMPLOYEE', 'CONTRACTOR', 'CLIENT'];

function isValidRole(r: string): r is WorkspaceRole {
  return (VALID_ROLES as string[]).includes(r);
}

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  // Default to EMPLOYEE (least privilege) until localStorage is read on the client.
  const [role, setRole] = useState<WorkspaceRole>('EMPLOYEE');
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    const user = getStoredUser();
    if (user?.role && isValidRole(user.role)) {
      setRole(user.role);
    }
    setChecked(true);
  }, [router]);

  // Render nothing until the auth check completes (avoids flash of unauthenticated content).
  if (!checked) return null;

  return <AppShell role={role}>{children}</AppShell>;
}
