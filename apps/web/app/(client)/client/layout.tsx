'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ClientShell } from '@/components/client-portal/client-shell';
import { isAuthenticated } from '@/lib/auth';

export default function ClientLayout({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return <ClientShell>{children}</ClientShell>;
}
