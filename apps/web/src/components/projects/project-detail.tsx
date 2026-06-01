import { EmptyState } from '@/components/states/empty-state';

type ProjectDetailProps = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
};

export function ProjectDetail({ id, name, status }: ProjectDetailProps) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="project-detail-title" className="rounded-md border border-line bg-panel p-6 shadow-shell">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Project</p>
        <h2 id="project-detail-title" className="mt-2 text-3xl font-semibold text-ink">
          {name}
        </h2>
        <p className="mt-2 text-sm text-slate-600">Project ID: {id}</p>
        <p className="mt-2 text-sm font-semibold text-slate-700">Status: {status}</p>
      </section>
      <EmptyState
        title="Live project data is not connected yet"
        description="Sprint 3 defines the core route and component baseline. Advanced project workflows remain deferred."
      />
    </div>
  );
}
