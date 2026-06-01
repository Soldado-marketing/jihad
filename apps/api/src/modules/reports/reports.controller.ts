import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateReportDefinitionDto } from './dto/create-report-definition.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(PermissionGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.REPORT })
  listReports(@Headers() headers: RequestHeaders) {
    return this.reportsService.listReports(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
    );
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.REPORT })
  createReport(@Headers() headers: RequestHeaders, @Body() dto: CreateReportDefinitionDto) {
    return this.reportsService.createReport(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      dto,
    );
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.REPORT })
  getReport(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.reportsService.getReport(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
    );
  }

  @Post(':id/run')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.REPORT_RUN })
  runReport(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.reportsService.runReport(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
    );
  }
}
