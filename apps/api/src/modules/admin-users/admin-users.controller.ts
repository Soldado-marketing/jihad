import {
  Body,
  Controller,
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
import { AdminUsersService } from './admin-users.service';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { ChangeRoleDto } from './dto/change-role.dto';

/**
 * All endpoints require a valid JWT (JwtAuthGuard) plus DB-verified Owner role
 * (enforced inside AdminUsersService.requireOwner).
 * Frontend role hints are never trusted — the service re-checks from DB.
 */
@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get('requests')
  getRequests(
    @CurrentUser() actor: JwtPayload,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    return this.adminUsersService.getAllRequests(actor.sub, actor.tenantId, status);
  }

  @Post('requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveRequest(
    @Param('id') requestId: string,
    @Body() dto: ApproveRequestDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.adminUsersService.approveRequest(requestId, dto, actor.sub, actor.tenantId);
  }

  @Post('requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectRequest(
    @Param('id') requestId: string,
    @Body() dto: RejectRequestDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.adminUsersService.rejectRequest(requestId, dto, actor.sub, actor.tenantId);
  }

  @Post(':userId/suspend')
  @HttpCode(HttpStatus.OK)
  suspendUser(
    @Param('userId') targetUserId: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.adminUsersService.suspendUser(targetUserId, actor.sub, actor.tenantId);
  }

  @Post(':userId/reactivate')
  @HttpCode(HttpStatus.OK)
  reactivateUser(
    @Param('userId') targetUserId: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.adminUsersService.reactivateUser(targetUserId, actor.sub, actor.tenantId);
  }

  @Patch(':userId/role')
  @HttpCode(HttpStatus.OK)
  changeRole(
    @Param('userId') targetUserId: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.adminUsersService.changeRole(targetUserId, dto, actor.sub, actor.tenantId);
  }
}
