import { Controller, Get, Headers, Param, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { InvoicesService } from './invoices.service';

@Controller('client/invoices')
@UseGuards(PermissionGuard)
export class ClientInvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermission({
    action: PermissionAction.READ,
    resource: PermissionResource.INVOICE,
    scope: 'client-portal',
  })
  listClientInvoices(@Headers() headers: RequestHeaders) {
    return this.invoicesService.listClientInvoices(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
    );
  }

  @Get(':id')
  @RequirePermission({
    action: PermissionAction.READ,
    resource: PermissionResource.INVOICE,
    scope: 'client-portal',
  })
  getClientInvoice(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.invoicesService.getClientInvoice(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
    );
  }
}
