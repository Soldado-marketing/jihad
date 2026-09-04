import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { StorageModule } from '../storage/storage.module';
import { FileVersionsRepository } from './file-versions.repository';
import { FileVersionsService } from './file-versions.service';

/**
 * Phase 3 - versioning and object storage for file assets.
 *
 * This module owns no controller on purpose: the version routes live on
 * FilesController under /api/files/:id/versions, which is the shape the
 * project's baseline spec defines. Hosting them here as well would collide on
 * the same path. Exporting the service keeps that controller thin while all
 * storage logic stays in this module.
 *
 * It must NOT import FilesModule - FilesModule imports this one.
 */
@Module({
  imports: [AuditModule, PermissionsModule, StorageModule],
  providers: [FileVersionsRepository, FileVersionsService],
  exports: [FileVersionsService],
})
export class FileVersionsModule {}
