import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FileVersionsModule } from '../file-versions/file-versions.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { StorageModule } from '../storage/storage.module';
import { ClientFilesController } from './client-files.controller';
import { FilesController } from './files.controller';
import { FilesRepository } from './files.repository';
import { FilesService } from './files.service';
import { SignedUrlService } from './signed-url.service';

@Module({
  controllers: [FilesController, ClientFilesController],
  // StorageModule: deleting a file has to delete the objects its versions own,
  // otherwise the rows disappear and the bytes stay in the bucket untracked.
  imports: [AuditModule, FileVersionsModule, MembershipsModule, PermissionsModule, StorageModule],
  providers: [FilesRepository, FilesService, SignedUrlService],
  exports: [FilesService, SignedUrlService],
})
export class FilesModule {}
