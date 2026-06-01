import { Module } from '@nestjs/common';
import { PermissionGuard } from './permission.guard';
import { PermissionService } from './permission.service';
import { ResourceScopeService } from './resource-scope.service';

@Module({
  exports: [PermissionGuard, PermissionService, ResourceScopeService],
  providers: [PermissionGuard, PermissionService, ResourceScopeService],
})
export class PermissionsModule {}
