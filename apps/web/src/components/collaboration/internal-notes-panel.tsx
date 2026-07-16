import { EmptyState } from '@/components/states/empty-state';

export type InternalNoteItem = {
  id: string;
  body: string;
  visibility: 'internal-only';
};

export function InternalNotesPanel({ notes }: { notes: InternalNoteItem[] }) {
  if (notes.length === 0) {
    return (
      <EmptyState
        title="No internal notes yet"
        description="Internal notes will appear after collaboration persistence is connected."
      />
    );
  }

  return (
    <section aria-labelledby="internal-notes-title" className="space-y-3">
      <h3 id="internal-notes-title" className="text-lg font-semibold text-ink">
        Internal notes
      </h3>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
        {notes.map((note) => (
          <li key={note.id} className="p-5">
            <p className="text-sm leading-6 text-slate-700">{note.body}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-accent">
              {note.visibility}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
