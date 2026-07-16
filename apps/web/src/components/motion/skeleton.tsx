/**
 * <Skeleton>
 * CSS-only shimmer placeholder. No JS animation — uses @keyframes.
 * Inject `skeletonCssKeyframes` from @/lib/motion into your global CSS,
 * OR rely on the globals.css import already present.
 *
 * Prefers-reduced-motion is handled in CSS (animation: none fallback).
 */

type SkeletonProps = {
  /** Tailwind height class, e.g. "h-4" */
  height?: string;
  /** Tailwind width class, e.g. "w-full" or "w-32" */
  width?: string;
  /** Extra classes */
  className?: string;
};

export function Skeleton({ className = '', height = 'h-4', width = 'w-full' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`maos-skeleton ${height} ${width} rounded-lg ${className}`}
    />
  );
}

/** Pre-built skeleton for a summary card */
export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5 shadow-card">
      <Skeleton height="h-9" width="w-9" className="rounded-xl" />
      <Skeleton height="h-3" width="w-24" className="mt-4" />
      <Skeleton height="h-8" width="w-16" className="mt-2" />
      <Skeleton height="h-3" width="w-full" className="mt-2" />
      <Skeleton height="h-3" width="w-3/4" className="mt-1" />
    </div>
  );
}

/** Pre-built skeleton for a table row */
export function RowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-line px-4 py-3">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} height="h-3" width={i === 0 ? 'w-32' : 'w-full'} />
      ))}
    </div>
  );
}
