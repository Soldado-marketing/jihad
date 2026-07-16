import { Skeleton } from '@/components/motion/skeleton';

type LoadingStateProps = {
  label?: string;
  /** Show skeleton cards instead of text (useful for grid sections) */
  variant?: 'text' | 'skeleton';
  /** Number of skeleton cards to show */
  count?: number;
};

export function LoadingState({
  count = 3,
  label = 'Loading workspace',
  variant = 'text',
}: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-live="polite">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-panel p-5 shadow-card">
            <Skeleton height="h-9" width="w-9" className="rounded-xl" />
            <Skeleton height="h-3" width="w-24" className="mt-4" />
            <Skeleton height="h-8" width="w-16" className="mt-2" />
            <Skeleton height="h-3" width="w-full" className="mt-2" />
            <Skeleton height="h-3" width="w-3/4" className="mt-1" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className="rounded-2xl border border-line bg-panel p-4 text-sm text-slate-600 shadow-card"
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent"
          aria-hidden="true"
        />
        {label}
      </div>
    </div>
  );
}
