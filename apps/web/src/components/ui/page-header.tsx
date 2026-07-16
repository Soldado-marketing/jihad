'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  const reduced = useReducedMotion();

  const fadeItem = (delay: number) => ({
    initial: reduced ? false as const : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.28,
      ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
      delay: reduced ? 0 : delay,
    },
  });

  return (
    <motion.section
      aria-labelledby="page-title"
      className="overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-card"
      {...fadeItem(0)}
    >
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <motion.p
            className="text-xs font-bold uppercase tracking-[0.22em] text-accent"
            {...fadeItem(0.05)}
          >
            {eyebrow}
          </motion.p>
          <motion.h2
            id="page-title"
            className="mt-3 max-w-full break-words text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
            {...fadeItem(0.09)}
          >
            {title}
          </motion.h2>
          <motion.p
            className="mt-3 max-w-3xl text-sm leading-6 text-slate-600"
            {...fadeItem(0.13)}
          >
            {description}
          </motion.p>
        </div>
        {actions ? (
          <motion.div className="shrink-0" {...fadeItem(0.15)}>
            {actions}
          </motion.div>
        ) : null}
      </div>
    </motion.section>
  );
}
