'use client';

/**
 * <ModalOverlay> + <ModalContent>
 * Animated backdrop and content panel for dialogs / drawers.
 * Use AnimatePresence around the conditional render.
 *
 * Usage:
 *   <AnimatePresence>
 *     {open && (
 *       <ModalOverlay onClose={() => setOpen(false)}>
 *         <ModalContent>
 *           ...your dialog body...
 *         </ModalContent>
 *       </ModalOverlay>
 *     )}
 *   </AnimatePresence>
 */

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type ModalOverlayProps = {
  children: ReactNode;
  onClose?: () => void;
};

export function ModalOverlay({ children, onClose }: ModalOverlayProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Content sits on top */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

type ModalContentProps = {
  children: ReactNode;
  className?: string;
};

export function ModalContent({ children, className }: ModalContentProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 4 }}
      transition={{ duration: 0.22, ease: [0.34, 1.2, 0.64, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Re-export AnimatePresence for convenience
export { AnimatePresence };
