import type { ReactNode } from 'react';

export function WorkspaceContent({ children }: { children: ReactNode }) {
  return (
    <main
      id="workspace-content"
      className="mx-auto w-full max-w-full min-w-0 flex-1 p-4 sm:max-w-7xl sm:p-6 lg:p-8"
      tabIndex={-1}
    >
      {children}
    </main>
  );
}
