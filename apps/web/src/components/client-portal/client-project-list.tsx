import Link from 'next/link';
import { EmptyState } from '@/components/states/empty-state';

export type ClientProjectListItem = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
};

export function ClientProjectList({ projects }: { projects: ClientProjectListItem[] }) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        description="Your projects will appear here as soon as we share them with you."
      />
    );
  }

  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-panel" aria-label="Client project list">
      {projects.map((project) => (
        <li key={project.id}>
          <Link className="block p-4 hover:bg-slate-50 focus-visible:bg-slate-50" href={`/client/projects/${project.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-semibold text-ink">{project.name}</span>
              <span className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-slate-600">
                {({ ACTIVE: 'In progress', PAUSED: 'Paused', ARCHIVED: 'Completed' } as const)[project.status] ?? project.status}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
