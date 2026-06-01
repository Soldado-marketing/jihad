import {
  ClientProjectList,
  type ClientProjectListItem,
} from '@/components/client-portal/client-project-list';

const clientProjects: ClientProjectListItem[] = [
  {
    id: 'sprint-4-client-project-placeholder',
    name: 'Client Project Placeholder',
    status: 'ACTIVE',
  },
];

export default function ClientProjectsPage() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="client-projects-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Client projects
        </p>
        <h2 id="client-projects-title" className="mt-2 text-3xl font-semibold text-ink">
          Projects
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Approved project placeholders for your account.
        </p>
      </section>
      <ClientProjectList projects={clientProjects} />
    </div>
  );
}
