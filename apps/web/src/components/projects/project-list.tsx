import Link from 'next/link';
import { EmptyState } from '@/components/states/empty-state';

export type ProjectListItem = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  openTaskCount: number;
};

type ProjectListProps = {
  projects: ProjectListItem[];
};

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        description="Create project workflows in Sprint 3 through the backend skeleton before connecting live UI data."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-line bg-panel shadow-shell">
      <ul className="divide-y divide-line" aria-label="Project list">
        {projects.map((project) => (
          <li key={project.id}>
            <Link className="block p-4 hover:bg-slate-50 focus-visible:bg-slate-50" href={`/projects/${project.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-ink">{project.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {project.openTaskCount} open task{project.openTaskCount === 1 ? '' : 's'}
                  </p>
                </div>
                <span className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {project.status}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
