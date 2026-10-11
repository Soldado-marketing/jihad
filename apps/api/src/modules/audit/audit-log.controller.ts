import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { PrismaService } from '../prisma/prisma.service';

const PAGE_SIZE = 50;
const OUTCOMES = ['SUCCESS', 'FAILURE', 'BLOCKED', 'PARTIAL'];

/**
 * Tenant audit log for the Audit UI (MAOS-T132). OWNER only: `sensitive`
 * denies every other role. Newest first with a cursor; optional filters.
 * Returns the already-redacted payload (AuditRedactor) but never session or
 * device identifiers.
 */
@Controller('audit-events')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AuditLogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.AUDIT_EVENT, sensitive: true })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('actorId') actorId?: string,
    @Query('outcome') outcome?: string,
    @Query('before') before?: string,
  ) {
    // Cursor "<ISO timestamp>|<id>": events sharing a timestamp are ordered
    // by id, so a page boundary never skips or repeats one.
    let cursor: { at: Date; id: string } | undefined;
    if (before) {
      const [at, id] = before.split('|');
      const date = new Date(at);
      if (!id || Number.isNaN(date.getTime())) throw new BadRequestException({ code: 'INVALID_CURSOR' });
      cursor = { at: date, id };
    }
    if (outcome && !OUTCOMES.includes(outcome)) {
      throw new BadRequestException({ code: 'INVALID_OUTCOME' });
    }
    const rows = await this.prisma.auditEvent.findMany({
      where: {
        tenantId: user.tenantId,
        ...(action ? { action: { startsWith: action.slice(0, 80) } } : {}),
        ...(resourceType ? { resourceType: resourceType.slice(0, 80) } : {}),
        ...(actorId ? { actorId } : {}),
        ...(outcome ? { outcome: outcome as 'SUCCESS' } : {}),
        ...(cursor
          ? { OR: [{ createdAt: { lt: cursor.at } }, { createdAt: cursor.at, id: { lt: cursor.id } }] }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        action: true,
        outcome: true,
        resourceType: true,
        resourceId: true,
        permissionResult: true,
        failureCategory: true,
        redactedPayload: true,
        createdAt: true,
        actor: { select: { id: true, displayName: true } },
      },
    });
    const items = rows.slice(0, PAGE_SIZE);
    return {
      items,
      nextBefore:
        rows.length > PAGE_SIZE ? `${items[items.length - 1].createdAt.toISOString()}|${items[items.length - 1].id}` : null,
    };
  }
}
