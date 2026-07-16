'use client';

/**
 * <FadeUp>
 * Wraps children in a fade + upward-slide entry animation.
 * Set `delay` (seconds) to stagger sibling FadeUp calls.
 * Respects prefers-reduced-motion automatically.
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type FadeUpProps = {
  children: ReactNode;
  delay?: number;
  /** Extra Tailwind classes on the wrapper div */
  className?: string;
};

export function FadeUp({ children, className, delay = 0 }: FadeUpProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0 : 0.3,
        ease: [0.0, 0.0, 0.2, 1],
        delay: reduced ? 0 : delay,
      }}
    >
      {children}
    </motion.div>
  );
}
