/**
 * Client-portal file routes.
 *
 * The internal routes on FilesController require FILE / FILE_VERSION READ
 * without a client-portal scope, so a CLIENT is refused at the permission guard
 * and FileVersionsService.assertClientMayRead — the per-file rule that a client
 * may only read a client-visible, APPROVED file — was never reached. These
 * routes are the way in: the guard allows the client-portal scope broadly, the
 * repository query filters to client-visible + approved, and the download still
 * runs through the same service, so that per-file check does the deciding.
 *
 * Nothing here exposes a storage key, a bucket name or a pre-signed URL; the
 * bytes are streamed through the API exactly as on the internal route.
 */

import { Controller, Get, Headers, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { DownloadFileVersionDto } from '../file-versions/dto/download-file-version.dto';
import { FileVersionsService } from '../file-versions/file-versions.service';
import { ClientScopeService } from '../memberships/client-scope.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { toActor, writeDownloadResponse } from './files.controller';
import { FilesService } from './files.service';

@Controller('client/files')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ClientFilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly versions: FileVersionsService,
    private readonly clientScope: ClientScopeService,
  ) {}

  @Get()
  @RequirePermission({
    action: PermissionAction.READ,
    resource: PermissionResource.FILE,
    scope: 'client-portal',
  })
  listClientFiles(@CurrentUser() user: JwtPayload) {
    return this.filesService.listForClient(user.tenantId, user.sub, user.role);
  }

  @Get(':id/versions/:versionId/content')
  @RequirePermission({
    action: PermissionAction.READ,
    resource: PermissionResource.FILE_VERSION,
    scope: 'client-portal',
  })
  async downloadVersion(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Query() query: DownloadFileVersionDto,
    @Headers('range') range: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    // The portal is for clients and for the OWNER/MANAGER preview. The list
    // route refuses work-scoped roles through the scope resolver; the content
    // route applies the same rule (C05 found it answering an EMPLOYEE).
    if (user.role !== 'CLIENT') await this.clientScope.resolve(user.tenantId, user.sub, user.role);

    const result = await this.versions.openDownload(
      toActor(user),
      id,
      versionId,
      query.disposition ?? 'attachment',
      range,
    );

    writeDownloadResponse(res, result);
  }
}
