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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { SubtasksService } from './subtasks.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SubtasksController {
  constructor(private readonly subtasksService: SubtasksService) {}

  @Get('tasks/:taskId/subtasks')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.SUBTASK })
  listForTask(@CurrentUser() user: JwtPayload, @Param('taskId') taskId: string) {
    return this.subtasksService.listForTask(user.tenantId, taskId);
  }

  @Post('tasks/:taskId/subtasks')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.SUBTASK })
  createForTask(
    @CurrentUser() user: JwtPayload,
    @Param('taskId') taskId: string,
    @Body() dto: CreateSubtaskDto,
  ) {
    return this.subtasksService.createForTask(user.tenantId, user.sub, taskId, dto);
  }

  @Patch('subtasks/:id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.SUBTASK })
  updateSubtask(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSubtaskDto,
  ) {
    return this.subtasksService.updateSubtask(user.tenantId, user.sub, id, dto);
  }

  @Delete('subtasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: PermissionAction.DELETE, resource: PermissionResource.SUBTASK })
  async deleteSubtask(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.subtasksService.deleteSubtask(user.tenantId, id);
  }
}
