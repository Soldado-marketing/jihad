export type SummaryCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function SummaryCard({ label, value, detail }: SummaryCardProps) {
  return (
    <article className="rounded-md border border-line bg-panel p-5 shadow-card">
      <div className="mb-4 h-1 w-10 rounded-full bg-accent" />
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}
