import Link from 'next/link';
import { EmptyState } from '@/components/states/empty-state';
import { FileVisibilityBadge, type FileVisibility } from './file-visibility-badge';

export type FileListItem = {
  id: string;
  name: string;
  visibility: FileVisibility;
  versionCount: number;
};

export function FileList({ files }: { files: FileListItem[] }) {
  if (files.length === 0) {
    return (
      <EmptyState
        title="No files yet"
        description="Sprint 6 reserves file metadata and versioning foundations."
      />
    );
  }

  return (
    <ul className="divide-y divide-line rounded-md border border-line bg-panel" aria-label="File list">
      {files.map((file) => (
        <li key={file.id}>
          <Link className="block p-4 hover:bg-slate-50 focus-visible:bg-slate-50" href={`/files/${file.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ink">{file.name}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {file.versionCount} version{file.versionCount === 1 ? '' : 's'}
                </p>
              </div>
              <FileVisibilityBadge visibility={file.visibility} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
