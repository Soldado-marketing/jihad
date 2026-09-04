/**
 * File asset routes.
 *
 * Phase 3 adds real object storage under /api/files/:id/versions:
 *  - POST   :id/versions                     upload a new version (multipart)
 *  - GET    :id/versions                     list versions (never exposes storageKey)
 *  - GET    :id/versions/:versionId          one version's metadata
 *  - GET    :id/versions/:versionId/content  authorised download / preview
 *
 * The content route streams bytes through the API. A storage key, bucket name,
 * or pre-signed bucket URL is never sent to the browser.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import { DownloadFileVersionDto } from '../file-versions/dto/download-file-version.dto';
import {
  ActorInput,
  DownloadResult,
  FileVersionsService,
} from '../file-versions/file-versions.service';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { allowedExtensions } from '../storage/file-type';
import { extensionOf } from '../storage/object-key';
import { MAX_UPLOAD_BYTES_HARD_LIMIT } from '../storage/storage.config';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { FilesService } from './files.service';

/**
 * Multer options for the upload route.
 *
 * memoryStorage keeps bytes off local disk entirely, which removes a whole
 * class of temp-file and traversal problems. fileSize here is the ABSOLUTE
 * ceiling; the per-deployment limit (FILE_MAX_UPLOAD_BYTES) is enforced again
 * inside the service, where the environment is read at request time.
 */
const UPLOAD_OPTIONS = {
  limits: {
    fields: 8,
    fileSize: MAX_UPLOAD_BYTES_HARD_LIMIT,
    files: 1,
  },
  fileFilter: (
    _req: unknown,
    file: { originalname: string },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    // Cheap first pass so an obviously disallowed type never reaches memory.
    // The authoritative check (content signature) runs in the service.
    callback(null, allowedExtensions().includes(extensionOf(file.originalname)));
  },
};

export function toActor(user: JwtPayload): ActorInput {
  return {
    actorId: user.sub,
    role: user.role,
    sessionId: user.sessionId,
    tenantId: user.tenantId,
  };
}

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FilesController {
  constructor(
    private readonly svc: FilesService,
    private readonly versions: FileVersionsService,
  ) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FILE })
  list(@CurrentUser() user: JwtPayload) { return this.svc.list(user.tenantId); }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.FILE })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateFileDto) {
    return this.svc.create(user.tenantId, user.sub, dto);
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FILE })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.get(user.tenantId, id); }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.FILE })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateFileDto) {
    return this.svc.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission({ action: PermissionAction.DELETE, resource: PermissionResource.FILE })
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) { return this.svc.delete(user.tenantId, id); }

  // ── Phase 3: versions backed by S3-compatible object storage ──────────────

  @Get(':id/versions')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FILE_VERSION })
  listVersions(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.versions.list(user.tenantId, id);
  }

  @Post(':id/versions')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.FILE_VERSION })
  @UseInterceptors(FileInterceptor('file', UPLOAD_OPTIONS))
  uploadVersion(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.versions.upload(toActor(user), id, file);
  }

  @Get(':id/versions/:versionId')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FILE_VERSION })
  getVersion(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versions.getOne(user.tenantId, id, versionId);
  }

  /**
   * Authorised download / preview.
   *
   * The response is written manually so the object is streamed rather than
   * buffered. Caching is disabled: the bytes are tenant-scoped and the URL
   * carries no capability of its own.
   */
  @Get(':id/versions/:versionId/content')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FILE_VERSION })
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

/**
 * Streams a DownloadResult to the client.
 *
 * Exported because the client-portal file route writes the identical response;
 * duplicating the headers there would be the obvious place for the two to drift
 * apart.
 */
export function writeDownloadResponse(res: Response, result: DownloadResult): void {
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `${result.disposition}; filename="${result.filename}"`);
  // Stops a browser from guessing a different (possibly executable) type.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  if (result.contentLength !== undefined) {
    res.setHeader('Content-Length', String(result.contentLength));
  }

  result.stream.on('error', () => {
    if (!res.headersSent) res.status(HttpStatus.BAD_GATEWAY);
    res.end();
  });

  result.stream.pipe(res);
}
