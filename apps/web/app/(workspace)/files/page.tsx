import { FileList, type FileListItem } from '@/components/files/file-list';

const sprint6Files: FileListItem[] = [
  {
    id: 'sprint-6-file-placeholder',
    name: 'Sprint 6 File Placeholder',
    versionCount: 1,
    visibility: 'INTERNAL',
  },
];

export default function FilesPage() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="files-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Files foundation
        </p>
        <h2 id="files-title" className="mt-2 text-3xl font-semibold text-ink">
          Files
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Internal file metadata, versioning, and signed URL placeholders for workspace users.
        </p>
      </section>
      <FileList files={sprint6Files} />
    </div>
  );
}
