/**
 * Bulk actions on tasks (MAOS G10).
 *
 * A bulk action is the single-task request, once per selected task: the same
 * routes, rules and audit records as one change in the editor, and one task
 * that fails does not undo the others. This file holds the parts that are plain
 * data work — which tasks are selected, which requests an action needs, and the
 * sentence that says what happened — so they are tested without a browser.
 */

export type BulkStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';

export type BulkAction =
  | { kind: 'status'; status: BulkStatus }
  | { kind: 'assign'; userId: string }
  | { kind: 'move'; projectId: string }
  | { kind: 'label'; labelId: string };

/** What an action needs to know about a task. */
export type BulkTask = {
  id: string;
  status: string;
  assignedToUserId: string | null;
  projectId: string | null;
  labels?: { label: { id: string } }[];
};

export type BulkRequest = { taskId: string; method: 'PATCH' | 'POST'; path: string; body?: Record<string, string> };

// ─── Selection ───────────────────────────────────────────────────────────────

export function toggleSelected(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (!next.delete(id)) next.add(id);
  return next;
}

export type SelectionState = 'none' | 'some' | 'all';

/** How much of what is shown is selected. Tasks that are not shown never count. */
export function selectionState(selected: ReadonlySet<string>, shownIds: readonly string[]): SelectionState {
  const count = shownIds.filter((id) => selected.has(id)).length;
  if (count === 0) return 'none';
  return count === shownIds.length ? 'all' : 'some';
}

/** The header box: everything shown when not all of it is selected, nothing when all of it is. */
export function toggleAllShown(selected: ReadonlySet<string>, shownIds: readonly string[]): Set<string> {
  return selectionState(selected, shownIds) === 'all' ? new Set() : new Set(shownIds);
}

/**
 * The selection cut down to what is shown, in the order shown. Nobody changes
 * a task they cannot see on the screen: a task that a filter has hidden is no
 * longer selected.
 */
export function shownSelection(selected: ReadonlySet<string>, shownIds: readonly string[]): string[] {
  return shownIds.filter((id) => selected.has(id));
}

// ─── The requests an action needs ────────────────────────────────────────────

function alreadySet(action: BulkAction, task: BulkTask): boolean {
  switch (action.kind) {
    case 'status': return task.status === action.status;
    case 'assign': return task.assignedToUserId === action.userId;
    case 'move': return task.projectId === action.projectId;
    case 'label': return (task.labels ?? []).some((entry) => entry.label.id === action.labelId);
  }
}

function requestFor(action: BulkAction, taskId: string): BulkRequest {
  const task = `/tasks/${encodeURIComponent(taskId)}`;
  switch (action.kind) {
    case 'status': return { taskId, method: 'PATCH', path: task, body: { status: action.status } };
    case 'assign': return { taskId, method: 'PATCH', path: task, body: { assignedToUserId: action.userId } };
    case 'move': return { taskId, method: 'PATCH', path: task, body: { projectId: action.projectId } };
    case 'label': return { taskId, method: 'POST', path: `${task}/labels/${encodeURIComponent(action.labelId)}` };
  }
}

/**
 * One request per task that the action really changes. A task that is already
 * in the chosen state gets no request, so nothing is recorded for it.
 */
export function planBulk(action: BulkAction, tasks: readonly BulkTask[]): { requests: BulkRequest[]; unchanged: number } {
  const changing = tasks.filter((task) => !alreadySet(action, task));
  return { requests: changing.map((task) => requestFor(action, task.id)), unchanged: tasks.length - changing.length };
}

// ─── Sentences ───────────────────────────────────────────────────────────────

const tasksWord = (n: number) => `${n} task${n === 1 ? '' : 's'}`;

/** The question asked before anything changes. `target` is the name people see (a status, a person, a project, a label). */
export function bulkQuestion(action: BulkAction, count: number, target: string): string {
  switch (action.kind) {
    case 'status': return `Set ${tasksWord(count)} to “${target}”?`;
    case 'assign': return `Assign ${tasksWord(count)} to ${target}?`;
    case 'move': return `Move ${tasksWord(count)} to the project “${target}”?`;
    case 'label': return `Add the label “${target}” to ${tasksWord(count)}?`;
  }
}

/**
 * What happened, in one or two sentences. `failed` carries the reasons the API
 * gave; equal reasons are said once.
 */
export function bulkResult(done: number, unchanged: number, failed: readonly string[]): string {
  const total = done + unchanged + failed.length;
  if (failed.length > 0) {
    const reasons = [...new Set(failed.map((r) => r.trim()).filter(Boolean))];
    const why = reasons.length > 0 ? ` ${reasons.slice(0, 2).join(' ')}` : '';
    const left = `${failed.length} could not be changed and ${failed.length === 1 ? 'is' : 'are'} still selected.`;
    return `${done} of ${tasksWord(total)} changed. ${left}${why}`;
  }
  if (done === 0) return `Nothing to change: ${total === 1 ? 'the task was' : `all ${tasksWord(total)} were`} already set.`;
  const already = unchanged > 0 ? ` ${unchanged} ${unchanged === 1 ? 'was' : 'were'} already set.` : '';
  return `${tasksWord(done)} changed.${already}`;
}
