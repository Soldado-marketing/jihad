import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateInvoiceDto } from './invoices.repository';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class InvoicesController {
  constructor(private readonly svc: InvoicesService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.INVOICE })
  list(@CurrentUser() user: JwtPayload) { return this.svc.list(user.tenantId); }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.INVOICE })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateInvoiceDto) { return this.svc.create(user.tenantId, user.sub, dto); }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.INVOICE })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.get(user.tenantId, id); }

  @Patch(':id/status')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.INVOICE })
  updateStatus(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: { status: InvoiceStatus }) {
    return this.svc.updateStatus(user.tenantId, id, dto.status);
  }
}
