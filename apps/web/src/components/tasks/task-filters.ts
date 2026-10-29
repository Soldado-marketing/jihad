/**
 * Task board filters and view kept in the URL (UX C2, on the MAOS-T60
 * helpers), so a filtered board survives a reload and can be shared.
 */

import { readFilters, writeFilters, type FilterDefinition, type FilterState } from '../../lib/filters';
import { PRIORITY_META, STATUS_META, type Member, type Project, type Task, type TaskPriority, type TaskStatus } from './task-types';

export type View = 'kanban' | 'list' | 'calendar';
export const VIEWS: readonly View[] = ['kanban', 'list', 'calendar'];
const DEFAULT_VIEW: View = 'kanban';

export interface TaskFilters {
  search: string;
  status: TaskStatus | '';
  priority: TaskPriority | '';
  assignee: string;
  project: string;
  view: View;
}

/**
 * Allowed URL values. Assignee and project ids come from the loaded lists, so
 * an id the viewer cannot see is ignored. The default view stays out of the URL.
 */
export function taskFilterDefinitions(members: readonly Member[], projects: readonly Project[]): FilterDefinition[] {
  return [
    { key: 'status', options: Object.keys(STATUS_META) },
    { key: 'priority', options: Object.keys(PRIORITY_META) },
    { key: 'assignee', options: members.map((m) => m.id) },
    { key: 'project', options: projects.map((p) => p.id) },
    { key: 'view', options: VIEWS.filter((v) => v !== DEFAULT_VIEW) },
  ];
}

export function readTaskFilters(params: URLSearchParams, definitions: readonly FilterDefinition[]): TaskFilters {
  const { q, values } = readFilters(params, definitions);
  return {
    search: q,
    status: (values.status ?? '') as TaskStatus | '',
    priority: (values.priority ?? '') as TaskPriority | '',
    assignee: values.assignee ?? '',
    project: values.project ?? '',
    view: (values.view as View | undefined) ?? DEFAULT_VIEW,
  };
}

/** The query string for the filters; keeps unrelated params, drops empty ones. */
export function writeTaskFilters(params: URLSearchParams, filters: TaskFilters, definitions: readonly FilterDefinition[]): string {
  const state: FilterState = {
    q: filters.search,
    values: {
      status: filters.status,
      priority: filters.priority,
      assignee: filters.assignee,
      project: filters.project,
      view: filters.view,
    },
  };
  return writeFilters(params, state, definitions);
}

export function hasTaskFilters(f: TaskFilters): boolean {
  return Boolean(f.search.trim() || f.status || f.priority || f.assignee || f.project);
}

/** Clearing the filters keeps the selected view. */
export function clearTaskFilters(f: TaskFilters): TaskFilters {
  return { search: '', status: '', priority: '', assignee: '', project: '', view: f.view };
}

export function filterTasks(tasks: readonly Task[], f: TaskFilters): Task[] {
  const needle = f.search.trim().toLowerCase();
  return tasks.filter((t) => {
    if (needle && !t.title.toLowerCase().includes(needle)) return false;
    if (f.status && t.status !== f.status) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.assignee && t.assignedToUserId !== f.assignee) return false;
    if (f.project && t.projectId !== f.project) return false;
    return true;
  });
}
