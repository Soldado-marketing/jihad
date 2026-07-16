export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type Label = {
  id: string;
  name: string;
  color: string;
};

export type TaskLabelEntry = {
  label: Label;
};

export type Member = {
  id: string;
  displayName: string | null;
  email: string;
  role: string;
};

export type Project = {
  id: string;
  name: string;
};

export type Subtask = {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' | 'ARCHIVED';
  assignedToUserId?: string | null;
};

export type FileAttachment = {
  id: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  taskId: string | null;
  createdAt: string;
  createdBy: { id: string; displayName: string | null } | null;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  dueAt: string | null;
  sortOrder?: number | null;
  projectId: string | null;
  assignedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string } | null;
  assignedTo: { id: string; displayName: string | null; email: string } | null;
  _count: { subtasks: number };
  labels?: TaskLabelEntry[];
};

export const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'TODO',        label: 'To Do',       color: '#94a3b8' },
  { status: 'IN_PROGRESS', label: 'In Progress',  color: '#0f766e' },
  { status: 'IN_REVIEW',   label: 'In Review',    color: '#b45309' },
  { status: 'DONE',        label: 'Done',         color: '#16a34a' },
];

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  LOW:    { label: 'Low',    color: '#16a34a', bg: '#dcfce7' },
  MEDIUM: { label: 'Medium', color: '#b45309', bg: '#fef9c3' },
  HIGH:   { label: 'High',   color: '#d97706', bg: '#fef3c7' },
  URGENT: { label: 'Urgent', color: '#b42318', bg: '#fee2e2' },
};

export const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  TODO:        { label: 'To Do',       color: '#64748b', bg: '#f1f5f9' },
  IN_PROGRESS: { label: 'In Progress', color: '#0f766e', bg: '#ccfbf1' },
  IN_REVIEW:   { label: 'In Review',   color: '#b45309', bg: '#fef3c7' },
  DONE:        { label: 'Done',        color: '#16a34a', bg: '#dcfce7' },
  BLOCKED:     { label: 'Blocked',     color: '#b42318', bg: '#fee2e2' },
  ARCHIVED:    { label: 'Archived',    color: '#94a3b8', bg: '#f8fafc' },
};

export function getInitials(name: string | null | undefined, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(' ');
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

export function avatarColor(id: string): string {
  const palette = ['#0f766e', '#1d4ed8', '#7c3aed', '#b45309', '#b42318', '#0e7490', '#4f46e5'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return palette[h % palette.length];
}

export function formatDueDate(dueAt: string | null): { label: string; overdue: boolean } | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const overdue = diffMs < 0;
  const month = due.toLocaleString('default', { month: 'short' });
  const day = due.getDate();
  if (diffDays === 0) return { label: 'Today', overdue };
  if (diffDays === 1) return { label: 'Tomorrow', overdue };
  if (diffDays === -1) return { label: 'Yesterday', overdue: true };
  return { label: `${month} ${day}`, overdue };
}
