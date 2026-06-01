import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditRedactor } from './audit-redactor';
import { AuditEventInput, AuditEventRecord } from './audit.types';

@Injectable()
export class AuditService {
  constructor(private readonly auditRedactor: AuditRedactor) {}

  createAuditEventPlaceholder(input: AuditEventInput): AuditEventRecord {
    // Sprint 1B defines append-only audit behavior. Persistence is wired through repositories later.
    return {
      action: input.action,
      actorId: input.actorId,
      actorRole: input.actorRole,
      correctionOfAuditEventId: input.correctionOfAuditEventId,
      deviceId: input.deviceId,
      failureCategory: input.failureCategory,
      id: randomUUID(),
      outcome: input.outcome,
      permissionResult: input.permissionResult,
      redactedPayload: input.payload
        ? (this.auditRedactor.redact(input.payload) as Record<string, unknown>)
        : undefined,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      sessionId: input.sessionId,
      tenantId: input.tenantId,
      timestamp: new Date().toISOString(),
    };
  }

  createCorrectionEventPlaceholder(
    originalAuditEventId: string,
    input: Omit<AuditEventInput, 'correctionOfAuditEventId'>,
  ): AuditEventRecord {
    return this.createAuditEventPlaceholder({
      ...input,
      correctionOfAuditEventId: originalAuditEventId,
    });
  }
}
