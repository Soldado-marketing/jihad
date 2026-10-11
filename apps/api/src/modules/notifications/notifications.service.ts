/**
 * V2 A1 — the write path for the existing Notification model.
 *
 * Before this, the module could only read: there were list/read endpoints and
 * no code anywhere that inserted a row, so the bell was permanently empty.
 * This adds the one writer the rest of the app calls. It is deliberately the
 * ONLY writer — feature modules never touch prisma.notification themselves.
 *
 * Three invariants callers cannot opt out of:
 *  - tenant scope: rows are written with the emitting tenant's id, and every
 *    recipient is verified to be a member of that tenant.
 *  - audience: an INTERNAL event never reaches a CLIENT, even if a caller
 *    names one, because each recipient's role is re-checked here.
 *  - payload: title and body are short human strings. No amounts, no balances,
 *    no file contents. A notification points at a resource; it never carries it.
 *
 * Creation is synchronous and best-effort: a notification failure must never
 * fail the business action that triggered it.
 */

import { Injectable, Logger } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { createHash } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { NotificationsRepository } from './notifications.repository';

/** Who an event may reach. */
export type NotificationAudience =
  /** Staff only. Filtered so a CLIENT can never receive it. */
  | 'INTERNAL'
  /** Addressed to one person and safe for any role, e.g. their own access approval. */
  | 'DIRECT';

export interface NotifyInput {
  tenantId: string;
  recipientUserIds?: string[];
  recipientRoles?: MembershipRole[];
  audience: NotificationAudience;
  /**
   * Stable identifier for this event occurrence. Two calls with the same key
   * produce one row. Use the id of the row the event is about.
   */
  dedupeKey: string;
  title: string;
  body?: string;
  resourceType?: string;
  resourceId?: string;
  /** Suppressed as a recipient: nobody needs to be told what they just did. */
  actorUserId?: string;
}

/** Roles that may receive an INTERNAL notification. */
const INTERNAL_ROLES: MembershipRole[] = [
  MembershipRole.OWNER,
  MembershipRole.MANAGER,
  MembershipRole.EMPLOYEE,
  MembershipRole.CONTRACTOR,
];

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repo: NotificationsRepository,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string, userId: string) { return this.repo.list(tenantId, userId); }

  async markRead(tenantId: string, userId: string, id: string) {
    const result = await this.repo.markRead(tenantId, userId, id);
    await this.recordAudit('notification.read', tenantId, userId, id);
    return result;
  }

  markAllRead(tenantId: string, userId: string) { return this.repo.markAllRead(tenantId, userId); }
  countUnread(tenantId: string, userId: string) { return this.repo.countUnread(tenantId, userId); }

  /**
   * The writer. Resolves recipients, drops anyone who must not receive the
   * event, and inserts one idempotent row each. Never throws.
   */
  async notify(input: NotifyInput): Promise<number> {
    try {
      const recipients = await this.resolveRecipients(input);
      let created = 0;

      for (const recipientUserId of recipients) {
        const row = await this.repo.createIfAbsent({
          id: this.notificationId(input.tenantId, recipientUserId, input.dedupeKey),
          tenantId: input.tenantId,
          recipientUserId,
          title: input.title,
          body: input.body,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
        });

        if (row) {
          created += 1;
          await this.recordAudit('notification.created', input.tenantId, input.actorUserId, row.id, {
            recipientUserId,
            resourceType: input.resourceType,
          });
        }
      }

      return created;
    } catch {
      // A notification is never worth failing the action that caused it.
      this.logger.warn(
        `notification_dispatch_failed tenant=${input.tenantId} key=${input.dedupeKey}`,
      );
      return 0;
    }
  }

  /**
   * Recipients, filtered.
   *
   * Explicit ids are checked against tenant membership rather than trusted, so
   * a caller cannot address a user outside the tenant — that is the
   * cross-tenant guard. INTERNAL events additionally drop CLIENT members.
   */
  private async resolveRecipients(input: NotifyInput): Promise<string[]> {
    const candidates = new Set<string>();

    if (input.recipientRoles?.length) {
      const roles =
        input.audience === 'INTERNAL'
          ? input.recipientRoles.filter((role) => INTERNAL_ROLES.includes(role))
          : input.recipientRoles;
      for (const id of await this.repo.findRecipientIdsByRole(input.tenantId, roles)) {
        candidates.add(id);
      }
    }

    for (const id of input.recipientUserIds ?? []) {
      if (id) candidates.add(id);
    }

    if (input.actorUserId) candidates.delete(input.actorUserId);

    const allowed: string[] = [];
    for (const userId of candidates) {
      const role = await this.repo.findMemberRole(input.tenantId, userId);
      if (role === null) continue;
      if (input.audience === 'INTERNAL' && role === MembershipRole.CLIENT) continue;
      allowed.push(userId);
    }

    return allowed;
  }

  /**
   * Deterministic row id: sha256 of tenant + recipient + event key.
   *
   * The Notification model has no unique constraint to hang idempotency on and
   * this phase adds no migration, so the primary key carries it instead — a
   * replayed event collides on P2002 and is dropped by the repository.
   */
  private notificationId(tenantId: string, recipientUserId: string, dedupeKey: string): string {
    return createHash('sha256')
      .update(`${tenantId} ${recipientUserId} ${dedupeKey}`)
      .digest('hex')
      .slice(0, 32);
  }

  /** Audit writes are best-effort; a logging failure must not fail the request. */
  private async recordAudit(
    action: 'notification.created' | 'notification.read',
    tenantId: string,
    actorId: string | undefined,
    resourceId: string,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.audit.createAuditEvent({
        action,
        actorId,
        tenantId,
        resourceType: 'notification',
        resourceId,
        permissionResult: AuditPermissionResult.ALLOWED,
        outcome: AuditOutcome.SUCCESS,
        payload,
      });
    } catch {
      this.logger.warn(`audit_write_failed action=${action}`);
    }
  }
}
