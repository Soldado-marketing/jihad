import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import {
  actorContextFromHeaders,
  RequestHeaders,
  tenantContextFromHeaders,
} from '../../common/http/request-context';
import { RequirePermission } from '../permissions/permission.decorator';
import { PermissionGuard } from '../permissions/permission.guard';
import { PermissionAction, PermissionResource } from '../permissions/permission.types';
import { CollaborationService } from './collaboration.service';
import { CreateInternalNoteDto } from './dto/create-internal-note.dto';

@Controller('collaboration/internal-notes')
@UseGuards(PermissionGuard)
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Get()
  @RequirePermission({ action: PermissionAction.READ, resource: PermissionResource.INTERNAL_NOTE })
  listInternalNotes(@Headers() headers: RequestHeaders) {
    return this.collaborationService.listInternalNotes(tenantContextFromHeaders(headers));
  }

  @Post()
  @RequirePermission({ action: PermissionAction.CREATE, resource: PermissionResource.INTERNAL_NOTE })
  createInternalNote(@Headers() headers: RequestHeaders, @Body() dto: CreateInternalNoteDto) {
    return this.collaborationService.createInternalNote(
      tenantContextFromHeaders(headers),
      actorContextFromHeaders(headers),
      dto,
    );
  }
}
