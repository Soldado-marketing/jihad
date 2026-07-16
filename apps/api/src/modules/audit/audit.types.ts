// Re-export Prisma-generated enums so this module and Prisma queries share the same type.
export { AuditOutcome, AuditPermissionResult, MembershipRole } from '@prisma/client';

// Failure category constants for login-blocking events
export const LoginBlockReason = {
  PENDING_APPROVAL: 'LOGIN_BLOCKED_PENDING_APPROVAL',
  REJECTED: 'LOGIN_BLOCKED_REJECTED',
  SUSPENDED: 'LOGIN_BLOCKED_SUSPENDED',
  ACCOUNT_DISABLED: 'LOGIN_BLOCKED_ACCOUNT_DISABLED',
} as const;

export type LoginBlockReason = (typeof LoginBlockReason)[keyof typeof LoginBlockReason];

// Action constants for registration/approval events
export const RegistrationAction = {
  SUBMITTED: 'registration.submitted',
  APPROVED: 'registration.approved',
  REJECTED: 'registration.rejected',
  ROLE_ASSIGNED: 'role.assigned',
  PERMISSIONS_ASSIGNED: 'permissions.assigned',
  SCOPE_ASSIGNED: 'scope.assigned',
  USER_SUSPENDED: 'user.suspended',
  USER_REACTIVATED: 'user.reactivated',
  ROLE_CHANGED: 'role.changed',
  LOGIN_BLOCKED: 'login.blocked',
} as const;

export interface AuditEventInput {
  actorId?: string;
  actorRole?: import('@prisma/client').MembershipRole;
  tenantId?: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  permissionResult: import('@prisma/client').AuditPermissionResult;
  outcome: import('@prisma/client').AuditOutcome;
  sessionId?: string;
  deviceId?: string;
  failureCategory?: string;
  payload?: Record<string, unknown>;
  correctionOfAuditEventId?: string;
}

export interface AuditEventRecord extends Omit<AuditEventInput, 'payload'> {
  id: string;
  redactedPayload?: Record<string, unknown>;
  timestamp: string;
}
