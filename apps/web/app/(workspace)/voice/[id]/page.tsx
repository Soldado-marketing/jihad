import { VoiceNoteDetail } from '@/components/voice/voice-note-detail';

type VoiceNoteDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VoiceNoteDetailPage({ params }: VoiceNoteDetailPageProps) {
  const { id } = await params;

  return <VoiceNoteDetail id={id} />;
}
