import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateTaskDto } from './dto/create-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';
import type { ListTaskFilters } from './tasks.repository';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.TASK })
  listTasks(
    @CurrentUser() user: JwtPayload,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedToUserId') assignedToUserId?: string,
    @Query('labelId') labelId?: string,
  ) {
    return this.tasksService.listTasks(user.tenantId, {
      projectId,
      status: status as ListTaskFilters['status'],
      priority: priority as ListTaskFilters['priority'],
      assignedToUserId,
      labelId,
    });
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.TASK })
  createTask(@CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(user.tenantId, user.sub, dto);
  }

  /**
   * Atomic bulk reorder endpoint.
   * MUST be declared before @Patch(':id') so NestJS does not treat the
   * literal string "reorder" as a task `:id` parameter.
   *
   * Payload: { items: [{ id, status?, sortOrder }] }
   * Returns: the updated tasks (id, status, sortOrder, updatedAt).
   */
  @Patch('reorder')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.TASK })
  reorderTasks(@CurrentUser() user: JwtPayload, @Body() dto: ReorderTasksDto) {
    return this.tasksService.reorderTasks(user.tenantId, dto);
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.TASK })
  getTask(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tasksService.getTask(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.TASK })
  updateTask(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(user.tenantId, user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: PermissionAction.DELETE, resource: PermissionResource.TASK })
  deleteTask(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tasksService.deleteTask(user.tenantId, id);
  }
}
