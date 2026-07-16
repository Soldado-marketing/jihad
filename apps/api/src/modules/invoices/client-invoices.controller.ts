import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { InvoicesService } from './invoices.service';

@Controller('client/invoices')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ClientInvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.INVOICE, scope: 'client-portal' })
  listClientInvoices(@CurrentUser() user: JwtPayload) {
    return this.invoicesService.list(user.tenantId);
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.INVOICE, scope: 'client-portal' })
  getClientInvoice(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.invoicesService.get(user.tenantId, id);
  }
}
