import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { ComplaintsService, ComplaintStatus, WorkRequestsService } from './complaints.service';
import { ClientReplyDto, OpenComplaintDto, StaffReplyDto } from './dto/complaint.dto';

const actorOf = (user: JwtPayload) => ({ tenantId: user.tenantId, userId: user.sub, role: user.role });
const STATUSES: ComplaintStatus[] = ['OPEN', 'ANSWERED', 'RESOLVED'];

/** Management reads, answers and resolves client problem reports; OWNER and MANAGER only (checked in the service). */
@Controller('complaints')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ComplaintsController {
  constructor(protected readonly svc: ComplaintsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CHAT_CHANNEL })
  list(@CurrentUser() user: JwtPayload, @Query('status') status?: string) {
    const wanted = STATUSES.find((s) => s === status);
    return this.svc.list(actorOf(user), wanted);
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CHAT_CHANNEL })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.svc.get(actorOf(user), id);
  }

  @Post(':id/messages')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.CHAT_MESSAGE })
  reply(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: StaffReplyDto) {
    return this.svc.staffReply(actorOf(user), id, dto);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.CHAT_CHANNEL })
  resolve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.svc.resolve(actorOf(user), id);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.CHAT_CHANNEL })
  reopen(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.svc.reopen(actorOf(user), id);
  }
}

/** The client's own problem reports ("Report a problem"), scoped by their membership. */
@Controller('client/problems')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ClientComplaintsController {
  constructor(protected readonly svc: ComplaintsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CHAT_CHANNEL, scope: 'client-portal' })
  list(@CurrentUser() user: JwtPayload) {
    return this.svc.listForClient(actorOf(user));
  }

  @Post()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CHAT_CHANNEL, scope: 'client-portal' })
  open(@CurrentUser() user: JwtPayload, @Body() dto: OpenComplaintDto) {
    return this.svc.open(actorOf(user), dto);
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CHAT_CHANNEL, scope: 'client-portal' })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.svc.getForClient(actorOf(user), id);
  }

  @Post(':id/messages')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.CHAT_CHANNEL, scope: 'client-portal' })
  reply(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: ClientReplyDto) {
    return this.svc.clientReply(actorOf(user), id, dto);
  }
}

/** Management reads, answers and closes client requests for new work (D02); OWNER and MANAGER only. */
@Controller('requests')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WorkRequestsController extends ComplaintsController {
  constructor(svc: WorkRequestsService) {
    super(svc);
  }
}

/** The client's own requests for new work, scoped by their membership. */
@Controller('client/requests')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ClientWorkRequestsController extends ClientComplaintsController {
  constructor(svc: WorkRequestsService) {
    super(svc);
  }
}
