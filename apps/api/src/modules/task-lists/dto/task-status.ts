export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED', 'ARCHIVED'] as const;
export type TaskStatusValue = (typeof TASK_STATUSES)[number];
