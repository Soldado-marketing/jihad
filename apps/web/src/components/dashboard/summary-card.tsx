'use client';

import { motion, useReducedMotion } from 'framer-motion';

export type SummaryCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function SummaryCard({ detail, label, value }: SummaryCardProps) {
  const reduced = useReducedMotion();

  return (
    <motion.article
      className="rounded-2xl border border-line bg-panel p-5 shadow-card"
      whileHover={
        reduced ? undefined : { y: -3, boxShadow: '0 10px 28px -8px rgba(15,23,42,0.13)' }
      }
      whileTap={reduced ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-xs font-black text-accent">
        {label.slice(0, 2).toUpperCase()}
      </div>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </motion.article>
  );
}
