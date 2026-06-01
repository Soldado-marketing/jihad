import { MembershipRole } from '../../common/identity/membership-role';

export enum AuditPermissionResult {
  ALLOWED = 'ALLOWED',
  DENIED = 'DENIED',
  NOT_EVALUATED = 'NOT_EVALUATED',
}

export enum AuditOutcome {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  BLOCKED = 'BLOCKED',
  PARTIAL = 'PARTIAL',
}

export interface AuditEventInput {
  actorId?: string;
  actorRole?: MembershipRole;
  tenantId?: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  permissionResult: AuditPermissionResult;
  outcome: AuditOutcome;
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
