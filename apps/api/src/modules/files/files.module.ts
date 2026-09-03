import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FileVersionsModule } from '../file-versions/file-versions.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ClientFilesController } from './client-files.controller';
import { FilesController } from './files.controller';
import { FilesRepository } from './files.repository';
import { FilesService } from './files.service';
import { SignedUrlService } from './signed-url.service';

@Module({
  controllers: [FilesController, ClientFilesController],
  imports: [AuditModule, FileVersionsModule, PermissionsModule],
  providers: [FilesRepository, FilesService, SignedUrlService],
  exports: [FilesService, SignedUrlService],
})
export class FilesModule {}
