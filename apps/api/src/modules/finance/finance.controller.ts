import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateCostRecordDto } from './dto/create-cost-record.dto';
import { CreateRevenueRecordDto } from './dto/create-revenue-record.dto';
import { FinanceService } from './finance.service';

@Controller('finance')
@UseGuards(PermissionGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('revenue')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.REVENUE_RECORD, sensitive: true })
  listRevenue(@Headers() headers: RequestHeaders) {
    return this.financeService.listRevenue(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
    );
  }

  @Post('revenue')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.REVENUE_RECORD, sensitive: true })
  createRevenue(@Headers() headers: RequestHeaders, @Body() dto: CreateRevenueRecordDto) {
    return this.financeService.createRevenue(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      dto,
    );
  }

  @Get('costs')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.COST_RECORD, sensitive: true })
  listCosts(@Headers() headers: RequestHeaders) {
    return this.financeService.listCosts(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
    );
  }

  @Post('costs')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.COST_RECORD, sensitive: true })
  createCost(@Headers() headers: RequestHeaders, @Body() dto: CreateCostRecordDto) {
    return this.financeService.createCost(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      dto,
    );
  }

  @Get('profitability-summary')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FINANCE, sensitive: true })
  getProfitabilitySummary(@Headers() headers: RequestHeaders) {
    return this.financeService.getProfitabilitySummary(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
    );
  }
}
