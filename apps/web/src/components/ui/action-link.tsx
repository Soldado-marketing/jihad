import Link from 'next/link';
import type { ReactNode } from 'react';

type ActionLinkProps = {
  children: ReactNode;
  href: string;
  tone?: 'primary' | 'secondary';
};

export function ActionLink({ children, href, tone = 'primary' }: ActionLinkProps) {
  return (
    <Link
      className={
        tone === 'primary'
          ? 'inline-flex items-center justify-center rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white shadow-lift hover:bg-slate-800 focus-visible:bg-slate-800'
          : 'inline-flex items-center justify-center rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50'
      }
      href={href}
    >
      {children}
    </Link>
  );
}
