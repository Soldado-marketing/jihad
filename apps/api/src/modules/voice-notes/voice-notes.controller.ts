import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { VoiceNotesService } from './voice-notes.service';

/**
 * Authorisation boundary: INTERNAL ROLES, tenant-wide.
 *
 * Voice notes are internal working material. The routes were tenant-scoped but
 * carried no role gate, so any authenticated member of the tenant - a CLIENT
 * included - could list, read, create and delete every voice note in it. The
 * VOICE_NOTE resource already sits in the MANAGER and EMPLOYEE default sets and
 * in neither the CONTRACTOR nor the CLIENT set, so declaring the requirement is
 * all it takes to line the route up with the model it was meant to follow.
 */
@Controller('voice-notes')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class VoiceNotesController {
  constructor(private readonly svc: VoiceNotesService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.VOICE_NOTE })
  list(@CurrentUser() user: JwtPayload) { return this.svc.list(user.tenantId); }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.VOICE_NOTE })
  create(@CurrentUser() user: JwtPayload, @Body() dto: { title: string; projectId?: string; taskId?: string }) {
    return this.svc.create(user.tenantId, user.sub, dto.title, dto.projectId, dto.taskId);
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.VOICE_NOTE })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.get(user.tenantId, id); }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: PermissionAction.DELETE, resource: PermissionResource.VOICE_NOTE })
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.delete(user.tenantId, id); }
}
