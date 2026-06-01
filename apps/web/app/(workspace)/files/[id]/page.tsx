import { FileDetail } from '@/components/files/file-detail';

type FileDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function FileDetailPage({ params }: FileDetailPageProps) {
  const { id } = await params;

  return (
    <FileDetail
      id={id}
      name="Sprint 6 File Placeholder"
      visibility="INTERNAL"
      versions={[
        {
          id: 'sprint-6-file-version-placeholder',
          status: 'ACTIVE',
          versionNumber: 1,
        },
      ]}
    />
  );
}
