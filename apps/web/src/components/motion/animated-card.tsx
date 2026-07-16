'use client';

/**
 * <AnimatedCard>
 * A motion.div wrapper that provides:
 * - Stagger-child entrance animation (when inside <StaggerList>)
 * - Subtle hover lift on desktop
 * - Tap feedback on mobile
 * - prefers-reduced-motion safe
 *
 * Usage:
 *   <StaggerList className="grid gap-4 md:grid-cols-3">
 *     {cards.map(c => (
 *       <StaggerItem key={c.id}>
 *         <AnimatedCard className="rounded-2xl border ...">
 *           ...
 *         </AnimatedCard>
 *       </StaggerItem>
 *     ))}
 *   </StaggerList>
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type AnimatedCardProps = {
  children: ReactNode;
  className?: string;
  /** Disable hover lift (e.g., for non-interactive display cards) */
  noHover?: boolean;
};

export function AnimatedCard({ children, className, noHover = false }: AnimatedCardProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={noHover ? undefined : { y: -3, boxShadow: '0 8px 24px -8px rgba(15,23,42,0.12)' }}
      whileTap={noHover ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}
