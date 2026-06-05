import { ProjectList, type ProjectListItem } from '@/components/projects/project-list';

const sprint3Projects: ProjectListItem[] = [
  {
    id: 'brand-launch-roadmap',
    name: 'Brand launch roadmap',
    openTaskCount: 8,
    status: 'ACTIVE',
  },
  {
    id: 'client-portal-foundation',
    name: 'Client portal foundation',
    openTaskCount: 4,
    status: 'ACTIVE',
  },
  {
    id: 'railway-staging-readiness',
    name: 'Railway staging readiness',
    openTaskCount: 6,
    status: 'PAUSED',
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
          Delivery projects for internal workspace users. The list uses preview data until
          PostgreSQL and API data are connected in staging.
        </p>
      </section>
      <ProjectList projects={sprint3Projects} />
    </div>
  );
}
