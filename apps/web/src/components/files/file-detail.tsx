import { FileVersionList, type FileVersionListItem } from './file-version-list';
import { FileVisibilityBadge, type FileVisibility } from './file-visibility-badge';
import { SignedUrlNotice } from './signed-url-notice';

export function FileDetail({
  id,
  name,
  versions,
  visibility,
}: {
  id: string;
  name: string;
  versions: FileVersionListItem[];
  visibility: FileVisibility;
}) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="file-detail-title" className="rounded-2xl border border-line bg-white p-6 shadow-lift">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">File</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 id="file-detail-title" className="text-3xl font-semibold text-ink">
            {name}
          </h2>
          <FileVisibilityBadge visibility={visibility} />
        </div>
        <p className="mt-2 text-sm text-slate-600">Reference: {id}</p>
      </section>
      <SignedUrlNotice />
      <FileVersionList versions={versions} />
    </div>
  );
}
