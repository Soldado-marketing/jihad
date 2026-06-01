import type { ReactNode } from 'react';
import { ClientSidebar } from './client-sidebar';
import { ClientTopbar } from './client-topbar';

export function ClientShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink md:flex">
      <ClientSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ClientTopbar />
        <main id="client-content" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
