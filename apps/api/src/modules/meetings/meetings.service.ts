import { Injectable } from '@nestjs/common';
import { ActorContext } from '../../common/auth/actor-context';
import { TenantContext } from '../../common/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';
import { AuditOutcome, AuditPermissionResult } from '../audit/audit.types';
import { ResourceScopeService } from '../permissions/resource-scope.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingRecord, MeetingsRepository } from './meetings.repository';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly meetingsRepository: MeetingsRepository,
    private readonly resourceScopeService: ResourceScopeService,
    private readonly auditService: AuditService,
  ) {}

  listMeetings(context: TenantContext) {
    this.resourceScopeService.validateTenantOwnership(context, {
      resourceTenantId: context.tenantId,
    });

    return this.meetingsRepository.list(context);
  }

  createMeeting(context: TenantContext, actor: ActorContext | undefined, dto: CreateMeetingDto) {
    if (actor) {
      this.resourceScopeService.validateActorScope(actor, { resourceTenantId: context.tenantId });
    }

    const meeting = this.meetingsRepository.create(context, actor, dto);
    return {
      meeting,
      auditEvent: this.recordAudit(context, actor, meeting),
    };
  }

  private recordAudit(
    context: TenantContext,
    actor: ActorContext | undefined,
    meeting: MeetingRecord,
  ) {
    return this.auditService.createAuditEventPlaceholder({
      action: 'meeting.created',
      actorId: actor?.actorId,
      actorRole: actor?.role,
      deviceId: actor?.deviceId,
      outcome: AuditOutcome.SUCCESS,
      permissionResult: AuditPermissionResult.ALLOWED,
      resourceId: meeting.id,
      resourceType: 'meeting',
      sessionId: actor?.sessionId,
      tenantId: context.tenantId,
      payload: { meeting },
    });
  }
}
