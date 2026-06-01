import { LeadDetail } from '@/components/crm/lead-detail';

type LeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;

  return (
    <LeadDetail
      company="Acme Growth"
      id={id}
      name="Sprint 5 Lead Placeholder"
      status="LEAD"
    />
  );
}
