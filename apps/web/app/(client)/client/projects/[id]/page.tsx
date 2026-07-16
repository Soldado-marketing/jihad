'use client';

import { use, useEffect, useState } from 'react';
import { ClientProjectDetail } from '@/components/client-portal/client-project-detail';
import { apiFetch } from '@/lib/fetch';

type Project = { id: string; name: string; status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' };

type ClientProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default function ClientProjectPage({ params }: ClientProjectPageProps) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Project>(`/client/projects/${id}`)
      .then(setProject)
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-slate-500 p-6">Loading…</p>;
  if (!project) return <p className="text-sm text-red-500 p-6">Project not found or not accessible.</p>;

  return <ClientProjectDetail id={project.id} name={project.name} status={project.status} />;
}
