import { VoiceNoteList, type VoiceNoteListItem } from '@/components/voice/voice-note-list';
import { VoiceRecorderPlaceholder } from '@/components/voice/voice-recorder-placeholder';

const sprint8VoiceNotes: VoiceNoteListItem[] = [
  {
    duration: '45 sec',
    id: 'sprint-8-voice-note',
    language: 'Mixed Arabic / English / German',
    title: 'Client revision voice note',
    transcriptStatus: 'LOW_CONFIDENCE',
  },
];

export default function VoicePage() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="voice-title">
        <p className="text-sm font-medium text-slate-600">Sprint 8</p>
        <h2 id="voice-title" className="mt-2 text-3xl font-semibold text-ink">
          Voice Notes
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Voice metadata, transcript placeholders, and review-only task drafts for internal users.
        </p>
      </section>
      <VoiceRecorderPlaceholder />
      <VoiceNoteList voiceNotes={sprint8VoiceNotes} />
    </div>
  );
}
