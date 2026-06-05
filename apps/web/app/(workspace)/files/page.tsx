import { FileList, type FileListItem } from '@/components/files/file-list';

const sprint6Files: FileListItem[] = [
  {
    id: 'uat-evidence-folder',
    name: 'UAT evidence folder',
    versionCount: 3,
    visibility: 'INTERNAL',
  },
  {
    id: 'client-brand-assets',
    name: 'Client brand assets',
    versionCount: 2,
    visibility: 'CLIENT_VISIBLE',
  },
  {
    id: 'release-checklist-export',
    name: 'Release checklist export',
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
          File metadata, version history, and permission-checked signed URL placeholders
          for internal workspace users.
        </p>
      </section>
      <FileList files={sprint6Files} />
    </div>
  );
}
