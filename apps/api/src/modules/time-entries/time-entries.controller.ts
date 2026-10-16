import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { RejectTimeEntryDto, UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { TimeEntriesService } from './time-entries.service';

/**
 * PERMISSION_CONTROLLED (resource TIME_ENTRY, MAOS-T72). Every internal role
 * works on its own entries; OWNER and MANAGER also read all entries and
 * approve or reject submitted ones (checked in the service from the database
 * membership). CLIENT: 403.
 */
@Controller('time-entries')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TimeEntriesController {
  constructor(private readonly entries: TimeEntriesService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.TIME_ENTRY })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('projectId') projectId?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.entries.list(await this.entries.caller(user.tenantId, user.sub), { from, to, projectId, userId, status });
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.TIME_ENTRY })
  async get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.entries.get(await this.entries.caller(user.tenantId, user.sub), id);
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.TIME_ENTRY })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTimeEntryDto) {
    return this.entries.create(await this.entries.caller(user.tenantId, user.sub), dto);
  }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.TIME_ENTRY })
  async update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateTimeEntryDto) {
    return this.entries.update(await this.entries.caller(user.tenantId, user.sub), id, dto);
  }

  @Post(':id/submit')
  @HttpCode(200)
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.TIME_ENTRY })
  async submit(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.entries.submit(await this.entries.caller(user.tenantId, user.sub), id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.TIME_ENTRY })
  async approve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.entries.approve(await this.entries.caller(user.tenantId, user.sub), id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.TIME_ENTRY })
  async reject(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: RejectTimeEntryDto) {
    return this.entries.reject(await this.entries.caller(user.tenantId, user.sub), id, dto.reason);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission({ action: PermissionAction.DELETE, resource: PermissionResource.TIME_ENTRY })
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.entries.remove(await this.entries.caller(user.tenantId, user.sub), id);
  }
}
