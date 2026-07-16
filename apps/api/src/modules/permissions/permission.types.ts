// Re-export VisibilityScope from @prisma/client so permission service and Prisma
// queries share the exact same type — no type-assertion casts required.
export { VisibilityScope } from '@prisma/client';

export enum PermissionAction {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
}

export enum PermissionResource {
  TENANT = 'tenant',
  USER = 'user',
  MEMBERSHIP = 'membership',
  INVITE = 'invite',
  SESSION = 'session',
  DEVICE = 'device',
  LOGIN_HISTORY = 'login-history',
  AUDIT_EVENT = 'audit-event',
  PROJECT = 'project',
  TASK = 'task',
  SUBTASK = 'subtask',
  LEAD = 'lead',
  OPPORTUNITY = 'opportunity',
  MEETING = 'meeting',
  FOLLOW_UP = 'follow-up',
  INTERNAL_NOTE = 'internal-note',
  FILE = 'file',
  FILE_VERSION = 'file-version',
  APPROVAL = 'approval',
  CHAT_CHANNEL = 'chat-channel',
  CHAT_MESSAGE = 'chat-message',
  NOTIFICATION = 'notification',
  REALTIME_SUBSCRIPTION = 'realtime-subscription',
  VOICE_NOTE = 'voice-note',
  VOICE_TRANSCRIPT = 'voice-transcript',
  VOICE_TO_TASK_DRAFT = 'voice-to-task-draft',
  AI_PLACEHOLDER = 'ai-placeholder',
  FINANCE = 'finance',
  REVENUE_RECORD = 'revenue-record',
  COST_RECORD = 'cost-record',
  INVOICE = 'invoice',
  PAYMENT = 'payment',
  DASHBOARD = 'dashboard',
  DASHBOARD_WIDGET = 'dashboard-widget',
  REPORT = 'report',
  REPORT_RUN = 'report-run',
}

export interface PermissionRequirement {
  action: PermissionAction;
  resource: PermissionResource;
  sensitive?: boolean;
  scope?: 'internal' | 'client-portal';
}

export interface PermissionDecision {
  allowed: boolean;
  reason: string;
  visibilityScope?: import('@prisma/client').VisibilityScope;
}
