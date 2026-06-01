import { ProjectDetail } from '@/components/projects/project-detail';

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;

  return (
    <ProjectDetail
      id={id}
      name="Sprint 3 Project Placeholder"
      status="ACTIVE"
    />
  );
}
