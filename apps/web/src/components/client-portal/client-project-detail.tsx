import { ClientSafeNotice } from './client-safe-notice';

type ClientProjectDetailProps = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
};

export function ClientProjectDetail({ id, name, status }: ClientProjectDetailProps) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="client-project-title" className="rounded-md border border-line bg-panel p-6 shadow-shell">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Project</p>
        <h2 id="client-project-title" className="mt-2 text-3xl font-semibold text-ink">
          {name}
        </h2>
        <p className="mt-2 text-sm text-slate-600">Reference: {id}</p>
        <p className="mt-2 text-sm font-semibold text-slate-700">Status: {status}</p>
      </section>
      <ClientSafeNotice />
    </div>
  );
}
