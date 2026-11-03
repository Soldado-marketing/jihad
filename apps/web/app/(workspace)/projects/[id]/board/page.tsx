'use client';

import { use } from 'react';
import { ProjectBoard } from '@/components/tasks/project-board';

export default function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProjectBoard projectId={id} />;
}
