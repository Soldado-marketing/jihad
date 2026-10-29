import type { ReactNode } from 'react';

export function WorkspaceContent({ children }: { children: ReactNode }) {
  return (
    <main
      id="workspace-content"
      className="mx-auto w-full max-w-full min-w-0 flex-1 px-4 pb-24 pt-5 sm:max-w-7xl sm:px-6 sm:pt-7 lg:px-8 lg:py-8"
      tabIndex={-1}
    >
      {children}
    </main>
  );
}
