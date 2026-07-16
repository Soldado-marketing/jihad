import { EmptyState } from '@/components/states/empty-state';

type ProjectDetailProps = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
};

export function ProjectDetail({ id, name, status }: ProjectDetailProps) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="project-detail-title" className="rounded-2xl border border-line bg-white p-6 shadow-lift">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Project</p>
        <h2 id="project-detail-title" className="mt-2 text-3xl font-semibold text-ink">
          {name}
        </h2>
        <p className="mt-2 text-sm text-slate-600">Project ID: {id}</p>
        <p className="mt-2 text-sm font-semibold text-slate-700">Status: {status}</p>
      </section>
      <EmptyState
        title="No live project activity yet"
        description="Detailed milestones, assignments, and activity history will appear after persistent project data is connected."
      />
    </div>
  );
}
