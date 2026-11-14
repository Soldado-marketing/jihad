/**
 * D08 - project status in the client portal: wording and arithmetic for the
 * numbers the API sends (`GET /client/progress`). The client is told how many
 * shared work steps stand at which stage - never which ones.
 *
 * No imports: the unit test loads this file directly.
 */

export type StepCounts = { total: number; planned: number; inProgress: number; inReview: number; done: number };
export type ProjectProgress = { id: string; name: string; status: string; steps: StepCounts | null };
export type StageKey = 'planned' | 'inProgress' | 'inReview' | 'done';

export const STAGES: { key: StageKey; label: string }[] = [
  { key: 'planned', label: 'Planned' },
  { key: 'inProgress', label: 'In progress' },
  { key: 'inReview', label: 'In review' },
  { key: 'done', label: 'Done' },
];

const PROJECT_STATE_LABEL: Record<string, string> = { ACTIVE: 'In progress', PAUSED: 'Paused', ARCHIVED: 'Completed' };

/** The project's own state in the client's words; an unknown state is shown as it came. */
export function projectStateLabel(status: string): string {
  return PROJECT_STATE_LABEL[status] ?? status;
}

/**
 * Share of finished work, 0-100. Rounded, but honest at the ends: it reads 100
 * only when everything is done and 0 only when nothing is.
 */
export function percentDone(steps: StepCounts | null): number {
  if (!steps || steps.total <= 0 || steps.done <= 0) return 0;
  if (steps.done >= steps.total) return 100;
  return Math.min(99, Math.max(1, Math.round((steps.done * 100) / steps.total)));
}

/** One sentence under the bar; empty when the numbers are not available. */
export function progressSummary(steps: StepCounts | null): string {
  if (!steps) return '';
  if (steps.total <= 0) return 'No work steps have been shared yet.';
  if (steps.done >= steps.total) return steps.total === 1 ? 'The work step is done.' : `All ${steps.total} work steps are done.`;
  return `${steps.done} of ${steps.total} work steps done`;
}

/** The panel's rows for the chosen project; every project when none is chosen. */
export function forProject(projects: ProjectProgress[], projectId: string): ProjectProgress[] {
  return projectId ? projects.filter((p) => p.id === projectId) : projects;
}

/** Project choices of My Work: projects with deliveries and projects with a status, each once, by name. */
export function projectChoices(fromDeliveries: [string, string][], progress: ProjectProgress[]): [string, string][] {
  const map = new Map<string, string>(fromDeliveries);
  for (const p of progress) if (!map.has(p.id)) map.set(p.id, p.name);
  return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
}
