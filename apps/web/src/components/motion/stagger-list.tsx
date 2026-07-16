'use client';

/**
 * <StaggerList> + <StaggerItem>
 * Wrap a list parent with <StaggerList> and each child with <StaggerItem>
 * to get a staggered cascade entrance animation.
 *
 * Usage:
 *   <StaggerList>
 *     {items.map(item => <StaggerItem key={item.id}><Card /></StaggerItem>)}
 *   </StaggerList>
 */

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { staggerContainer, staggerChild } from '@/lib/motion';

type StaggerListProps = {
  children: ReactNode;
  className?: string;
  /** ARIA / data attributes forwarded to the wrapper div */
  'aria-label'?: string;
  'aria-busy'?: boolean | 'true' | 'false';
  'aria-live'?: 'off' | 'assertive' | 'polite';
  role?: string;
  id?: string;
};

export function StaggerList({ children, className, ...htmlAttrs }: StaggerListProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className} {...htmlAttrs}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      {...htmlAttrs}
    >
      {children}
    </motion.div>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  className?: string;
};

export function StaggerItem({ children, className }: StaggerItemProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={staggerChild}>
      {children}
    </motion.div>
  );
}
