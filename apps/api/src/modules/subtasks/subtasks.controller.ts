import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { SubtasksService } from './subtasks.service';

@Controller()
@UseGuards(PermissionGuard)
export class SubtasksController {
  constructor(private readonly subtasksService: SubtasksService) {}

  @Get('tasks/:taskId/subtasks')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.SUBTASK })
  listForTask(@Headers() headers: RequestHeaders, @Param('taskId') taskId: string) {
    return this.subtasksService.listForTask(tenantContextFromHeaders(headers), taskId);
  }

  @Post('tasks/:taskId/subtasks')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.SUBTASK })
  createForTask(
    @Headers() headers: RequestHeaders,
    @Param('taskId') taskId: string,
    @Body() dto: CreateSubtaskDto,
  ) {
    return this.subtasksService.createForTask(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      taskId,
      dto,
    );
  }

  @Patch('subtasks/:id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.SUBTASK })
  updateSubtask(
    @Headers() headers: RequestHeaders,
    @Param('id') id: string,
    @Body() dto: UpdateSubtaskDto,
  ) {
    return this.subtasksService.updateSubtask(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
      dto,
    );
  }
}
