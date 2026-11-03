'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clientNavigation } from '@/navigation/client-navigation';

export function ClientSidebar() {
  const pathname = usePathname() ?? '';
  // Overview is active only on /client itself; a section also covers its detail pages.
  const isActive = (href: string) => (href === '/client' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <aside
      aria-label="Client portal navigation"
      className="w-full border-b border-slate-800 bg-navy text-white shadow-shell md:min-h-screen md:w-64 md:border-b-0 md:border-e md:border-slate-800"
    >
      <div className="hidden border-b border-white/10 px-4 py-5 md:block">
        <p className="text-lg font-semibold">Client area</p>
      </div>
      <nav className="grid grid-cols-4 gap-1 p-2 md:block md:p-3" aria-label="Client workspace">
        {clientNavigation.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive(item.href) ? 'page' : undefined}
            className={`block rounded-lg px-1 py-2.5 text-center text-xs font-semibold hover:bg-white/10 focus-visible:bg-white/10 md:px-3 md:text-start md:text-sm ${isActive(item.href) ? 'bg-white/15 text-white' : 'text-white/85'}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
