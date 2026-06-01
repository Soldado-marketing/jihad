'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LogoutButton } from '@/components/layout/logout-button';
import { cn } from '@/lib/utils';

const navigation = [
  {
    label: 'Agency OS',
    href: '/agency-os',
    description: 'Client work, production boards, approvals, and workload',
  },
  {
    label: 'Topics',
    href: '/topics',
    description: 'Inbox topics and workflow control',
  },
  {
    label: 'Logs',
    href: '/logs',
    description: 'Audit trail and runtime issues',
  },
  {
    label: 'Settings',
    href: '/settings',
    description: 'Environment-backed configuration',
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-30 border-b border-white/10 bg-brand-deep text-brand-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-80 lg:border-b-0 lg:border-r lg:border-white/6">
      <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_right,_rgba(249,202,141,0.12),_transparent_22%),linear-gradient(180deg,_#070f26_0%,_#151836_100%)]">
        <div className="border-b border-white/8 px-5 py-6">
          <div className="rounded-[1.75rem] border border-white/8 bg-white/4 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sand">
              SH Investments
            </p>
            <h1 className="mt-3 font-display text-3xl leading-none text-brand-white">
              Weekly Social Workflow
            </h1>
            <p className="mt-3 text-sm leading-6 text-brand-white/68">
              Arabic and German post generation, reviewer approval, and manual publishing packages.
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-5">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex rounded-[1.6rem] px-4 py-4 transition-all duration-200',
                  isActive
                    ? 'bg-brand-sand text-brand-deep shadow-soft'
                    : 'text-brand-white/82 hover:bg-white/6',
                )}
              >
                <div className="space-y-1">
                  <p className="font-semibold">{item.label}</p>
                  <p
                    className={cn(
                      'text-sm',
                      isActive ? 'text-brand-deep/72' : 'text-brand-white/55',
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 pt-0">
          <div className="rounded-[1.8rem] border border-white/8 bg-white/4 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-sand">
              Scope
            </p>
            <p className="mt-3 text-sm leading-6 text-brand-white/70">
              Single-company system for SH Investments only. Final output stops at READY FOR MANUAL PUBLISHING.
            </p>
          </div>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </div>
    </aside>
  );
}
