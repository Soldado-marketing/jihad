import { ProjectList, type ProjectListItem } from '@/components/projects/project-list';

const sprint3Projects: ProjectListItem[] = [
  {
    id: 'sprint-3-project-placeholder',
    name: 'Sprint 3 Project Placeholder',
    openTaskCount: 2,
    status: 'ACTIVE',
  },
];

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="projects-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Project delivery
        </p>
        <h2 id="projects-title" className="mt-2 text-3xl font-semibold text-ink">
          Projects
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Sprint 3 adds project routes and placeholder UI for internal workspace users only.
          Client portal access remains deferred.
        </p>
      </section>
      <ProjectList projects={sprint3Projects} />
    </div>
  );
}
