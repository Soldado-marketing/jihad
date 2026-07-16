'use client';

/**
 * <PageTransition>
 * Wraps a page's root element to provide a fast, minimal crossfade
 * + slight upward slide when the route changes.
 *
 * Usage — place in each page file:
 *   export default function DashboardPage() {
 *     return (
 *       <PageTransition>
 *         <PageHeader ... />
 *         ...
 *       </PageTransition>
 *     );
 *   }
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

export function PageTransition({ children, className }: PageTransitionProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
