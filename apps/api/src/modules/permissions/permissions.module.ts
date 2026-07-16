import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionGuard } from './permission.guard';
import { PermissionService } from './permission.service';
import { ResourceScopeService } from './resource-scope.service';

@Module({
  imports: [PrismaModule],
  exports: [PermissionGuard, PermissionService, ResourceScopeService],
  providers: [PermissionGuard, PermissionService, ResourceScopeService],
})
export class PermissionsModule {}
