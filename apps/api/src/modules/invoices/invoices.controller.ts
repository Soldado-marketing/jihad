import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
@UseGuards(PermissionGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.INVOICE, sensitive: true })
  listInvoices(@Headers() headers: RequestHeaders) {
    return this.invoicesService.listInvoices(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
    );
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.INVOICE, sensitive: true })
  createInvoice(@Headers() headers: RequestHeaders, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.createInvoice(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      dto,
    );
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.INVOICE, sensitive: true })
  getInvoice(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.invoicesService.getInvoice(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
    );
  }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.INVOICE, sensitive: true })
  updateInvoice(
    @Headers() headers: RequestHeaders,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.updateInvoice(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
      dto,
    );
  }
}
