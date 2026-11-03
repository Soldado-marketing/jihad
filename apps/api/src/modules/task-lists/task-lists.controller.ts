import { Body, Controller, Get, Param, ParseBoolPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateTaskListDto } from './dto/create-task-list.dto';
import { ReorderTaskListsDto } from './dto/reorder-task-lists.dto';
import { UpdateTaskListDto } from './dto/update-task-list.dto';
import { TaskListsService } from './task-lists.service';

/**
 * Authorisation boundary: PERMISSION_CONTROLLED.
 * Reading a board's lists needs project READ; changing the list structure is
 * project configuration and needs project UPDATE (OWNER, MANAGER). Moving
 * cards between lists stays task UPDATE (PATCH /tasks/reorder). The service
 * adds tenant and work-scope checks, so a CLIENT or a foreign id gets nothing.
 */
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TaskListsController {
  constructor(private readonly taskLists: TaskListsService) {}

  @Get('projects/:projectId/lists')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.PROJECT })
  list(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived?: boolean,
  ) {
    return this.taskLists.list(user.tenantId, user.sub, projectId, includeArchived ?? false);
  }

  @Post('projects/:projectId/lists/initialize')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.PROJECT })
  initialize(@CurrentUser() user: JwtPayload, @Param('projectId') projectId: string) {
    return this.taskLists.initialize(user.tenantId, user.sub, projectId);
  }

  @Post('projects/:projectId/lists')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.PROJECT })
  create(@CurrentUser() user: JwtPayload, @Param('projectId') projectId: string, @Body() dto: CreateTaskListDto) {
    return this.taskLists.create(user.tenantId, user.sub, projectId, dto);
  }

  @Patch('projects/:projectId/lists/reorder')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.PROJECT })
  reorder(@CurrentUser() user: JwtPayload, @Param('projectId') projectId: string, @Body() dto: ReorderTaskListsDto) {
    return this.taskLists.reorder(user.tenantId, user.sub, projectId, dto);
  }

  @Patch('lists/:id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.PROJECT })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateTaskListDto) {
    return this.taskLists.update(user.tenantId, user.sub, id, dto);
  }
}
