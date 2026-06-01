type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = 'Loading workspace' }: LoadingStateProps) {
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className="rounded-md border border-line bg-panel p-4 text-sm text-slate-600"
    >
      {label}
    </div>
  );
}
