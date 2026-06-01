import { VoiceToTaskDraftDetail } from '@/components/voice/voice-to-task-draft-detail';

type VoiceToTaskDraftDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VoiceToTaskDraftDetailPage({
  params,
}: VoiceToTaskDraftDetailPageProps) {
  const { id } = await params;

  return <VoiceToTaskDraftDetail id={id} />;
}
