import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { CreateFileVersionDto } from '../file-versions/dto/create-file-version.dto';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(PermissionGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FILE })
  listFiles(@Headers() headers: RequestHeaders) {
    return this.filesService.listFiles(tenantContextFromHeaders(headers));
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.FILE })
  createFile(@Headers() headers: RequestHeaders, @Body() dto: CreateFileDto) {
    return this.filesService.createFile(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      dto,
    );
  }

  @Get(':id')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FILE })
  getFile(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.filesService.getFile(tenantContextFromHeaders(headers), id);
  }

  @Patch(':id')
  @RequirePermission({ action: PermissionAction.UPDATE, resource: PermissionResource.FILE })
  updateFile(@Headers() headers: RequestHeaders, @Param('id') id: string, @Body() dto: UpdateFileDto) {
    return this.filesService.updateFile(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
      dto,
    );
  }

  @Get(':id/versions')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FILE_VERSION })
  listVersions(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.filesService.listVersions(tenantContextFromHeaders(headers), id);
  }

  @Post(':id/versions')
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.FILE_VERSION })
  createVersion(
    @Headers() headers: RequestHeaders,
    @Param('id') id: string,
    @Body() dto: CreateFileVersionDto,
  ) {
    return this.filesService.createVersion(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
      dto,
    );
  }

  @Get(':id/signed-url')
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.FILE, sensitive: true })
  getSignedUrl(@Headers() headers: RequestHeaders, @Param('id') id: string) {
    return this.filesService.getSignedUrl(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      id,
    );
  }
}
