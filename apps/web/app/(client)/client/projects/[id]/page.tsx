import { ClientProjectDetail } from '@/components/client-portal/client-project-detail';

type ClientProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientProjectPage({ params }: ClientProjectPageProps) {
  const { id } = await params;

  return <ClientProjectDetail id={id} name="Client Project Placeholder" status="ACTIVE" />;
}
