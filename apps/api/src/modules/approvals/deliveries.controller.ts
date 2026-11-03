import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { DeliveriesService } from './deliveries.service';
import { ClientDeliveryDecisionDto, SubmitDeliveryDto } from './dto/delivery.dto';

const actorOf = (user: JwtPayload) => ({ tenantId: user.tenantId, userId: user.sub, role: user.role });

/** Staff side: send work to the client and follow its rounds. */
@Controller('deliveries')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DeliveriesController {
  constructor(private readonly svc: DeliveriesService) {}

  /** Who may send is decided in the service: the work's assignee, or an OWNER/MANAGER. */
  @Post()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.APPROVAL })
  submit(@CurrentUser() user: JwtPayload, @Body() dto: SubmitDeliveryDto) {
    return this.svc.submit(actorOf(user), dto);
  }

  @Get('file/:fileAssetId')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FILE })
  listForFile(@CurrentUser() user: JwtPayload, @Param('fileAssetId') fileAssetId: string) {
    return this.svc.listForFile(user.tenantId, fileAssetId);
  }
}

/** Client portal side: the caller's own deliveries, scoped by their membership. */
@Controller('client/deliveries')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ClientDeliveriesController {
  constructor(private readonly svc: DeliveriesService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.APPROVAL, scope: 'client-portal' })
  list(@CurrentUser() user: JwtPayload) {
    return this.svc.listForClient(actorOf(user));
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.APPROVAL, scope: 'client-portal' })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.svc.getForClient(actorOf(user), id);
  }

  /** A client answers its own delivery; the service refuses every other role. */
  @Post(':id/decision')
  @HttpCode(HttpStatus.OK)
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.APPROVAL, scope: 'client-portal' })
  decide(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: ClientDeliveryDecisionDto) {
    return this.svc.decideForClient(actorOf(user), id, dto);
  }
}
