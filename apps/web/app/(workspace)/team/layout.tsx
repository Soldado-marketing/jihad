import type { ReactNode } from 'react';
import { TeamTabs } from '@/components/team/team-tabs';

/** Team & Access (MAOS E01): tabs above each section; the sections themselves are unchanged. */
export default function TeamLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TeamTabs />
      {children}
    </>
  );
}
