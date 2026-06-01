import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { FilesController } from './files.controller';
import { FilesRepository } from './files.repository';
import { FilesService } from './files.service';
import { SignedUrlService } from './signed-url.service';

@Module({
  controllers: [FilesController],
  imports: [AuditModule, PermissionsModule],
  providers: [FilesRepository, FilesService, SignedUrlService],
  exports: [FilesService, SignedUrlService],
})
export class FilesModule {}
