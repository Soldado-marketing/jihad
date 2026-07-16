/**
 * MAOS Motion System
 * ─────────────────────────────────────────────
 * Central source of truth for all Framer Motion animation variants.
 * All durations are short and purposeful (Linear / Stripe feel).
 * prefers-reduced-motion is respected via the `useReducedMotion` hook
 * from framer-motion — import it in any component that needs it.
 *
 * RTL is handled by providing `slideLeft` and `slideRight` as named
 * exports so callers can flip direction based on document direction.
 */

import type { Variants } from 'framer-motion';

// ─── Shared easing curves ────────────────────────────────────────────────────
export const ease = {
  /** Standard UI ease – smooth in, slightly spring out */
  standard: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  /** Enter ease – elements arriving on screen */
  enter: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
  /** Exit ease – elements leaving screen */
  exit: [0.4, 0.0, 1, 1] as [number, number, number, number],
  /** Spring-like overshoot for playful elements */
  spring: [0.34, 1.2, 0.64, 1] as [number, number, number, number],
};

// ─── Duration tokens ─────────────────────────────────────────────────────────
export const duration = {
  instant: 0.08,
  fast: 0.15,
  normal: 0.22,
  moderate: 0.3,
  slow: 0.45,
};

// ─── Core variants ───────────────────────────────────────────────────────────

/** Fade up — used for hero text, page headers, cards entering viewport */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.moderate, ease: ease.enter },
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: { duration: duration.fast, ease: ease.exit },
  },
};

/** Fade in — no directional movement, used for overlays/modals */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.moderate, ease: ease.standard },
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast, ease: ease.exit },
  },
};

/** Scale + fade — used for modals, popovers, dropdowns */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.normal, ease: ease.spring },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: duration.fast, ease: ease.exit },
  },
};

/** Slide from the inline-start (left in LTR, right in RTL) — sidebar */
export const slideInStart: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.moderate, ease: ease.enter },
  },
  exit: {
    opacity: 0,
    x: -16,
    transition: { duration: duration.fast, ease: ease.exit },
  },
};

/** Slide from top — topbar, notification banners */
export const slideInTop: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.enter },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: duration.fast, ease: ease.exit },
  },
};

/** Toast – slides in from the bottom-end corner */
export const toastVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: duration.normal, ease: ease.spring },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.96,
    transition: { duration: duration.fast, ease: ease.exit },
  },
};

/** Drawer / mobile sidebar — slides in from left edge */
export const drawerVariants: Variants = {
  hidden: { opacity: 0, x: '-100%' },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.moderate, ease: ease.enter },
  },
  exit: {
    opacity: 0,
    x: '-100%',
    transition: { duration: duration.normal, ease: ease.exit },
  },
};

/** Table row — slides in from the inline-end (right in LTR) */
export const rowReveal: Variants = {
  hidden: { opacity: 0, x: 10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: duration.normal,
      ease: ease.enter,
      delay: Math.min(i * 0.04, 0.3),
    },
  }),
};

/** Stagger container — parent whose children stagger-in */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

/** Stagger child — used inside staggerContainer */
export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.enter },
  },
};

/** Empty state — combined fade + slight scale up */
export const emptyState: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.slow, ease: ease.spring },
  },
};

/** Page-level transition — fast crossfade with slight upward movement */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.moderate, ease: ease.enter },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: duration.fast, ease: ease.exit },
  },
};

// ─── Skeleton shimmer keyframes (CSS only — no JS) ───────────────────────────
// Inject once via a <style> tag or add to globals.css
export const skeletonCssKeyframes = `
@keyframes maos-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
.maos-skeleton {
  background: linear-gradient(
    90deg,
    #f1f5f9 25%,
    #e2e8f0 50%,
    #f1f5f9 75%
  );
  background-size: 800px 100%;
  animation: maos-shimmer 1.4s ease-in-out infinite;
  border-radius: 0.5rem;
}
@media (prefers-reduced-motion: reduce) {
  .maos-skeleton { animation: none; background: #f1f5f9; }
}
`;

// ─── Transition presets for motion.* elements ─────────────────────────────────
export const spring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 28,
};

export const springGentle = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 24,
};
