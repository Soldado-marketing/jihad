import {
  InternalNotesPanel,
  type InternalNoteItem,
} from '@/components/collaboration/internal-notes-panel';

const sprint5InternalNotes: InternalNoteItem[] = [
  {
    body: 'Sprint 5 internal collaboration note placeholder.',
    id: 'sprint-5-internal-note-placeholder',
    visibility: 'internal-only',
  },
];

export default function CollaborationPage() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="collaboration-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Collaboration foundation
        </p>
        <h2 id="collaboration-title" className="mt-2 text-3xl font-semibold text-ink">
          Collaboration
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Internal notes for team context stay inside the workspace boundary.
        </p>
      </section>
      <InternalNotesPanel notes={sprint5InternalNotes} />
    </div>
  );
}
