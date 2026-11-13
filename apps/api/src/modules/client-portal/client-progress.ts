/**
 * D08 - what a client may know about the work in a project: how many shared
 * work steps stand at which stage. Pure rules, no database access.
 *
 * The client never receives a task: only these four numbers and their sum.
 * An internal blockage is not shown as such; it counts as "in progress".
 * Archived work is not counted at all.
 */

export type ProgressStage = 'planned' | 'inProgress' | 'inReview' | 'done';

export interface StageCounts {
  total: number;
  planned: number;
  inProgress: number;
  inReview: number;
  done: number;
}

const STAGE_OF: Record<string, ProgressStage> = {
  TODO: 'planned',
  IN_PROGRESS: 'inProgress',
  BLOCKED: 'inProgress',
  IN_REVIEW: 'inReview',
  DONE: 'done',
};

/** The client-facing stage of a task status; null for a status that is not counted. */
export function stageOf(status: string): ProgressStage | null {
  return STAGE_OF[status] ?? null;
}

export function emptyCounts(): StageCounts {
  return { total: 0, planned: 0, inProgress: 0, inReview: 0, done: 0 };
}

/** Folds (status, count) rows into the four stages. Unknown and uncounted statuses are ignored. */
export function countStages(rows: { status: string; count: number }[]): StageCounts {
  const counts = emptyCounts();
  for (const row of rows) {
    const stage = stageOf(row.status);
    if (!stage || !Number.isInteger(row.count) || row.count <= 0) continue;
    counts[stage] += row.count;
    counts.total += row.count;
  }
  return counts;
}
