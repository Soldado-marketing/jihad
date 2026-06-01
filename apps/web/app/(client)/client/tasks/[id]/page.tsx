import { ClientTaskDetail } from '@/components/client-portal/client-task-detail';

type ClientTaskPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientTaskPage({ params }: ClientTaskPageProps) {
  const { id } = await params;

  return <ClientTaskDetail id={id} title="Client Task Placeholder" status="TODO" />;
}
