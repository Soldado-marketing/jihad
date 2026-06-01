import type { ReactNode } from 'react';

import { Sidebar } from '@/components/layout/sidebar';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="min-h-screen lg:pl-80">
        <div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
