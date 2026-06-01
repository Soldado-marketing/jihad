import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(PermissionGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.TASK })
  listTasks(@Headers() headers: RequestHeaders) {
    return this.tasksService.listTasks(tenantContextFromHeaders(headers));
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.TASK })
  createTask(@Headers() headers: RequestHeaders, @Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      dto,
    );
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.TASK })
  getTask(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.tasksService.getTask(tenantContextFromHeaders(headers), id);
  }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.TASK })
  updateTask(@Headers() headers: RequestHeaders, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.updateTask(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
      dto,
    );
  }
}
