import Link from 'next/link';
import { clientNavigation } from '@/navigation/client-navigation';

export function ClientSidebar() {
  return (
    <aside
      aria-label="Client portal navigation"
      className="w-full border-b border-slate-800 bg-navy text-white shadow-shell md:min-h-screen md:w-64 md:border-b-0 md:border-e md:border-slate-800"
    >
      <div className="border-b border-white/10 px-4 py-5">
        <p className="text-lg font-semibold">MAOS Client</p>
        <p className="mt-1 text-xs text-white/70">Client-safe workspace</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto p-3 md:block" aria-label="Client workspace">
        {clientNavigation.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="block whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/10 focus-visible:bg-white/10"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
