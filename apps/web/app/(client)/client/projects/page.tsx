'use client';

import { useEffect, useState } from 'react';
import { ClientProjectList, type ClientProjectListItem } from '@/components/client-portal/client-project-list';
import { apiFetch } from '@/lib/fetch';

export default function ClientProjectsPage() {
  const [projects, setProjects] = useState<ClientProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ClientProjectListItem[]>('/client/projects')
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <section aria-labelledby="client-projects-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Client projects</p>
        <h2 id="client-projects-title" className="mt-2 text-3xl font-semibold text-ink">Projects</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Approved project information visible to your account.
        </p>
      </section>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <ClientProjectList projects={projects} />
      )}
    </div>
  );
}
