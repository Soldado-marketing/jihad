'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isTeamTabActive, TEAM_TABS } from '@/navigation/team-tabs';

/** Team & Access tabs (MAOS E01); the sections are listed in `@/navigation/team-tabs`. */
export function TeamTabs() {
  const pathname = usePathname();
  return (
    <div className="mx-auto max-w-5xl px-6 pt-6">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Team &amp; Access</p>
      <nav aria-label="Team & Access sections" className="mt-3 flex gap-1 overflow-x-auto border-b border-line">
        {TEAM_TABS.map((tab) => {
          const active = isTeamTabActive(tab.href, pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${active ? 'border-brand font-medium text-ink' : 'border-transparent text-muted hover:text-ink'}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
