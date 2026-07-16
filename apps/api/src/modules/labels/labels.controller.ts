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
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { LabelsService } from './labels.service';

/**
 * Labels controller.
 *
 * Uses @Controller() with no prefix (same pattern as SubtasksController) so
 * route paths are written in full on each method decorator.
 *
 * Permission strategy (no new PermissionResource enum values):
 *   - Label CRUD (workspace config):  PermissionResource.PROJECT
 *     → OWNER/MANAGER: read + write (PROJECT is in MANAGER_WRITE_RESOURCES)
 *     → EMPLOYEE/CONTRACTOR: read only (PROJECT is in their read sets)
 *   - Task-label assignment:          PermissionResource.TASK UPDATE
 *     → OWNER/MANAGER/EMPLOYEE/CONTRACTOR: allowed (all have TASK write)
 */
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  // ─── Label CRUD ──────────────────────────────────────────────────────────

  @Get('labels')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.PROJECT })
  listLabels(@CurrentUser() user: JwtPayload) {
    return this.labelsService.listLabels(user.tenantId);
  }

  @Post('labels')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.PROJECT })
  createLabel(@CurrentUser() user: JwtPayload, @Body() dto: CreateLabelDto) {
    return this.labelsService.createLabel(user.tenantId, dto);
  }

  @Patch('labels/:id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.PROJECT })
  updateLabel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLabelDto,
  ) {
    return this.labelsService.updateLabel(user.tenantId, id, dto);
  }

  @Delete('labels/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: PermissionAction.DELETE, resource: PermissionResource.PROJECT })
  async deleteLabel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.labelsService.deleteLabel(user.tenantId, id);
  }

  // ─── Task-label assignment ────────────────────────────────────────────────

  @Post('tasks/:taskId/labels/:labelId')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.TASK })
  assignLabel(
    @CurrentUser() user: JwtPayload,
    @Param('taskId') taskId: string,
    @Param('labelId') labelId: string,
  ) {
    return this.labelsService.assignLabel(user.tenantId, taskId, labelId);
  }

  @Delete('tasks/:taskId/labels/:labelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.TASK })
  async removeLabel(
    @CurrentUser() user: JwtPayload,
    @Param('taskId') taskId: string,
    @Param('labelId') labelId: string,
  ) {
    await this.labelsService.removeLabel(user.tenantId, taskId, labelId);
  }
}
