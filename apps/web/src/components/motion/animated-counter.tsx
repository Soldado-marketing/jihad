'use client';

/**
 * <AnimatedCounter>
 * Counts from 0 (or `from`) to `value` when it enters the viewport.
 * Falls back to static display when prefers-reduced-motion is set.
 *
 * Usage:
 *   <AnimatedCounter value={284} suffix=" leads" />
 *   <AnimatedCounter value={42800} prefix="$" />
 */

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion, useInView } from 'framer-motion';

type AnimatedCounterProps = {
  value: number;
  from?: number;
  prefix?: string;
  suffix?: string;
  duration?: number; // seconds
  className?: string;
};

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function AnimatedCounter({
  className,
  duration = 1.4,
  from = 0,
  prefix = '',
  suffix = '',
  value,
}: AnimatedCounterProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const [display, setDisplay] = useState(reduced ? value : from);

  useEffect(() => {
    if (reduced || !inView) return;

    const startTime = performance.now();
    const durationMs = duration * 1000;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const current = Math.round(from + (value - from) * easeOutCubic(progress));
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [inView, value, from, duration, reduced]);

  return (
    <span ref={ref} className={className} aria-label={`${prefix}${value}${suffix}`}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
