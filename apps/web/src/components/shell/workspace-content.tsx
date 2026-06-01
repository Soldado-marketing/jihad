import type { ReactNode } from 'react';

export function WorkspaceContent({ children }: { children: ReactNode }) {
  return (
    <main id="workspace-content" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8" tabIndex={-1}>
      {children}
    </main>
  );
}
