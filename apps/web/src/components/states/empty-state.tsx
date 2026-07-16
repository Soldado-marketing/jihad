'use client';

import { motion, useReducedMotion } from 'framer-motion';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
};

export function EmptyState({ actionLabel, description, title }: EmptyStateProps) {
  const reduced = useReducedMotion();

  return (
    <motion.section
      aria-labelledby="empty-state-title"
      className="rounded-2xl border border-dashed border-line bg-panel p-6 shadow-card"
      initial={reduced ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.34, 1.2, 0.64, 1] }}
    >
      <motion.div
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-500"
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1, ease: [0.0, 0.0, 0.2, 1] }}
      >
        0
      </motion.div>
      <motion.h2
        id="empty-state-title"
        className="text-lg font-semibold text-ink"
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.14, ease: [0.0, 0.0, 0.2, 1] }}
      >
        {title}
      </motion.h2>
      <motion.p
        className="mt-2 max-w-2xl text-sm leading-6 text-slate-600"
        initial={reduced ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.18, ease: [0.0, 0.0, 0.2, 1] }}
      >
        {description}
      </motion.p>
      {actionLabel ? (
        <motion.button
          className="mt-4 rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          disabled
          type="button"
          initial={reduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.22, ease: [0.0, 0.0, 0.2, 1] }}
          whileHover={reduced ? undefined : { y: -1 }}
          whileTap={reduced ? undefined : { scale: 0.98 }}
        >
          {actionLabel}
        </motion.button>
      ) : null}
    </motion.section>
  );
}
