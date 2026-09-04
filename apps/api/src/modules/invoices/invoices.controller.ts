/**
 * Invoice routes.
 *
 * Phase 4 adds the document side of the lifecycle:
 *  - GET  :id/pdf   render the invoice as a PDF
 *  - POST :id/send  email the PDF to the client and mark the invoice SENT
 */

import { Body, Controller, Get, HttpStatus, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { SendInvoiceDto } from './dto/send-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice.dto';
import { InvoiceActor, InvoicesService } from './invoices.service';

function toActor(user: JwtPayload): InvoiceActor {
  return {
    actorId: user.sub,
    role: user.role,
    sessionId: user.sessionId,
    tenantId: user.tenantId,
  };
}

/** Shared by both PDF routes so the headers cannot drift apart. */
export function writePdfResponse(res: Response, buffer: Buffer, filename: string): void {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', String(buffer.length));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(HttpStatus.OK).end(buffer);
}

@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class InvoicesController {
  constructor(private readonly svc: InvoicesService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.INVOICE })
  list(@CurrentUser() user: JwtPayload) { return this.svc.list(user.tenantId); }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.INVOICE })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateInvoiceDto) {
    return this.svc.create(user.tenantId, user.sub, dto);
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.INVOICE })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.get(user.tenantId, id); }

  @Patch(':id/status')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.INVOICE })
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceStatusDto,
  ) {
    return this.svc.updateStatus(user.tenantId, id, dto.status as InvoiceStatus);
  }

  @Get(':id/pdf')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.INVOICE })
  async pdf(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.svc.renderPdf(user.tenantId, id);
    writePdfResponse(res, buffer, filename);
  }

  @Post(':id/send')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.INVOICE })
  send(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SendInvoiceDto,
  ) {
    return this.svc.send(toActor(user), id, dto);
  }
}
