import { OpportunityDetail } from '@/components/crm/opportunity-detail';

type OpportunityDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OpportunityDetailPage({ params }: OpportunityDetailPageProps) {
  const { id } = await params;

  return (
    <OpportunityDetail
      id={id}
      status="CONTACTED"
      title="Sprint 5 Opportunity Placeholder"
      valueLabel="USD 2,500"
    />
  );
}
