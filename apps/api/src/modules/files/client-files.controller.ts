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

import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { DownloadFileVersionDto } from '../file-versions/dto/download-file-version.dto';
import { FileVersionsService } from '../file-versions/file-versions.service';
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
  ) {}

  @Get()
  @RequirePermission({
    action: PermissionAction.READ,
    resource: PermissionResource.FILE,
    scope: 'client-portal',
  })
  listClientFiles(@CurrentUser() user: JwtPayload) {
    return this.filesService.listForClient(user.tenantId);
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
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.versions.openDownload(
      toActor(user),
      id,
      versionId,
      query.disposition ?? 'attachment',
    );

    writeDownloadResponse(res, result);
  }
}
