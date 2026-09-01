/**
 * Client-portal invoice routes.
 *
 * These use the client-scoped repository queries, which filter to
 * clientVisible = true and exclude DRAFT. Reusing the internal list here (as an
 * earlier revision did) would have exposed every tenant invoice, drafts
 * included, to any CLIENT user.
 */

import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { writePdfResponse } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Controller('client/invoices')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ClientInvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.INVOICE, scope: 'client-portal' })
  listClientInvoices(@CurrentUser() user: JwtPayload) {
    return this.invoicesService.listForClient(user.tenantId);
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.INVOICE, scope: 'client-portal' })
  getClientInvoice(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.invoicesService.getForClient(user.tenantId, id);
  }

  @Get(':id/pdf')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.INVOICE, scope: 'client-portal' })
  async clientInvoicePdf(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.invoicesService.renderPdf(user.tenantId, id, {
      forClient: true,
    });
    writePdfResponse(res, buffer, filename);
  }
}
