import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateRateDto, RerateDto, UpdateRateDto } from './dto/rate.dto';
import { RatesService } from './rates.service';

/** OWNER_ONLY (resource RATE, sensitive; plus the database OWNER check in the service). MAOS-T73. */
@Controller('rates')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RatesController {
  constructor(private readonly rates: RatesService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.RATE, sensitive: true })
  list(@CurrentUser() user: JwtPayload) {
    return this.rates.list(user.tenantId, user.sub);
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.RATE, sensitive: true })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRateDto) {
    return this.rates.create(user.tenantId, user.sub, dto);
  }

  /** Re-resolves entries dated from..to (not BILLED); one audit event per changed entry. */
  @Post('rerate')
  @HttpCode(200)
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.RATE, sensitive: true })
  rerate(@CurrentUser() user: JwtPayload, @Body() dto: RerateDto) {
    return this.rates.rerate(user.tenantId, user.sub, dto);
  }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.RATE, sensitive: true })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateRateDto) {
    return this.rates.update(user.tenantId, user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission({ action: PermissionAction.DELETE, resource: PermissionResource.RATE, sensitive: true })
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.rates.remove(user.tenantId, user.sub, id);
  }
}
