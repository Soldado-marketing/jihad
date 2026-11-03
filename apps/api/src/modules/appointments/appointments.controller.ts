import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';

const actorOf = (user: JwtPayload) => ({ tenantId: user.tenantId, userId: user.sub, role: user.role });

/** Staff schedule, change and cancel shooting appointments; OWNER, MANAGER, EMPLOYEE only (checked in the service). */
@Controller('appointments')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.TASK })
  list(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string) {
    return this.svc.list(actorOf(user), projectId);
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.TASK })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAppointmentDto) {
    return this.svc.create(actorOf(user), dto);
  }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.TASK })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.svc.update(actorOf(user), id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.TASK })
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.svc.cancel(actorOf(user), id);
  }
}

/** The client's own appointments, scoped by their membership. */
@Controller('client/appointments')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ClientAppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.TASK, scope: 'client-portal' })
  list(@CurrentUser() user: JwtPayload) {
    return this.svc.listForClient(actorOf(user));
  }

  @Post(':id/seen')
  @HttpCode(HttpStatus.OK)
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.TASK, scope: 'client-portal' })
  seen(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.svc.markSeen(actorOf(user), id);
  }
}
