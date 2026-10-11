import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/class-names';

type KpiCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Change versus the comparison period, already formatted (e.g. "+12%"). */
  delta?: { text: string; direction: 'up' | 'down' | 'flat'; good?: boolean };
  href?: string;
};

/** One number with context (MAOS-T61). Links when `href` is given. */
export function KpiCard({ label, value, hint, delta, href }: KpiCardProps) {
  const body = (
    <>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {delta && (
        <p
          className={cn(
            'mt-1 text-xs font-semibold',
            delta.direction === 'flat' ? 'text-muted' : delta.good ? 'text-accent' : 'text-danger',
          )}
        >
          <span aria-hidden="true">{delta.direction === 'up' ? '▲ ' : delta.direction === 'down' ? '▼ ' : ''}</span>
          {delta.text}
        </p>
      )}
      {hint && <p className="mt-2 text-sm leading-6 text-slate-600">{hint}</p>}
    </>
  );
  const frame = 'block rounded-2xl border border-line bg-panel p-5 shadow-card';
  return href ? (
    <Link href={href} className={cn(frame, 'transition-shadow hover:shadow-md')}>
      {body}
    </Link>
  ) : (
    <article className={frame}>{body}</article>
  );
}
