import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditRedactor } from './audit-redactor';
import {
  AuditEventInput,
  AuditEventRecord,
  AuditOutcome,
  AuditPermissionResult,
} from './audit.types';

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditRedactor: AuditRedactor,
  ) {}

  // ── Persistent audit (writes to AuditEvent table) ─────────────────────────

  async createAuditEvent(input: AuditEventInput): Promise<AuditEventRecord> {
    // JSON.parse/stringify converts Record<string,unknown> → any, which is
    // directly assignable to Prisma's InputJsonValue without type assertions.
    const redactedPayload = input.payload
      ? JSON.parse(JSON.stringify(this.auditRedactor.redact(input.payload)))
      : undefined;

    const record = await this.prisma.auditEvent.create({
      data: {
        tenantId: input.tenantId ?? null,
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        action: input.action,
        permissionResult: input.permissionResult,
        outcome: input.outcome,
        sessionId: input.sessionId ?? null,
        deviceId: input.deviceId ?? null,
        failureCategory: input.failureCategory ?? null,
        redactedPayload,
        correctionOfAuditEventId: input.correctionOfAuditEventId ?? null,
      },
    });

    return {
      id: record.id,
      action: record.action,
      actorId: record.actorId ?? undefined,
      actorRole: record.actorRole ?? undefined,
      correctionOfAuditEventId: record.correctionOfAuditEventId ?? undefined,
      deviceId: record.deviceId ?? undefined,
      failureCategory: record.failureCategory ?? undefined,
      outcome: record.outcome,
      permissionResult: record.permissionResult,
      redactedPayload: record.redactedPayload
        ? (JSON.parse(JSON.stringify(record.redactedPayload)) as Record<string, unknown>)
        : undefined,
      resourceId: record.resourceId ?? undefined,
      resourceType: record.resourceType,
      sessionId: record.sessionId ?? undefined,
      tenantId: record.tenantId ?? undefined,
      timestamp: record.createdAt.toISOString(),
    };
  }

  // ── Legacy placeholders (kept for backward compatibility) ─────────────────
  // These enforce append-only audit behavior: audit records are never deleted or modified.
  // createCorrectionEventPlaceholder is the stub for the correction/amendment flow (post-MVP).

  createAuditEventPlaceholder(input: AuditEventInput): AuditEventRecord {
    const redactedPayload = input.payload
      ? (this.auditRedactor.redact(input.payload) as Record<string, unknown>)
      : undefined;

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
      redactedPayload,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      sessionId: input.sessionId,
      tenantId: input.tenantId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * createCorrectionEventPlaceholder — post-MVP stub.
   * When an audit event must be amended (e.g. incorrect actor, wrong resource ID),
   * a correction event is appended that references the original via correctionOfAuditEventId.
   * Audit records themselves are never deleted or modified (append-only audit behavior).
   */
  createCorrectionEventPlaceholder(originalEventId: string, correction: Partial<AuditEventInput>): AuditEventRecord {
    return this.createAuditEventPlaceholder({
      action: 'audit.correction',
      outcome: correction.outcome ?? AuditOutcome.SUCCESS,
      permissionResult: correction.permissionResult ?? AuditPermissionResult.NOT_EVALUATED,
      resourceType: correction.resourceType ?? 'AuditEvent',
      correctionOfAuditEventId: originalEventId,
      ...correction,
    });
  }
}
