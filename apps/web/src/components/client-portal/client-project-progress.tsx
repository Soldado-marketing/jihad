import { type ProjectProgress, STAGES, percentDone, progressSummary, projectStateLabel } from '@/lib/client-progress';

/**
 * D08: where each shared project stands - its state, a bar for the finished
 * share and four numbers. Numbers only; nothing here can be opened.
 */
export function ClientProjectProgress({ projects }: { projects: ProjectProgress[] }) {
  if (projects.length === 0) return null;
  return (
    <section aria-labelledby="project-status-heading" className="grid gap-2" data-testid="project-progress">
      <h2 id="project-status-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">Project status</h2>
      <ul className="grid gap-2">
        {projects.map((project) => {
          const percent = percentDone(project.steps);
          const summary = progressSummary(project.steps);
          return (
            <li key={project.id} className="rounded-xl border border-line bg-white p-4" data-testid="project-progress-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="min-w-0 break-words font-medium text-ink">{project.name}</span>
                <span className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-slate-600">{projectStateLabel(project.status)}</span>
              </div>
              {project.steps && project.steps.total > 0 && (
                <div
                  role="progressbar"
                  aria-label={`${project.name}: ${summary}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
                >
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
                </div>
              )}
              {summary && <p className="mt-2 text-sm text-slate-700">{summary}</p>}
              {project.steps && project.steps.total > 0 && (
                <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  {STAGES.map((stage) => (
                    <div key={stage.key} className="flex items-baseline gap-1.5">
                      <dt className="text-muted">{stage.label}</dt>
                      <dd className="font-semibold text-ink">{project.steps![stage.key]}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
