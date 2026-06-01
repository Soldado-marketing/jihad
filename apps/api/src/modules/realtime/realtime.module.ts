import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { RealtimeGatewayPlaceholder } from './realtime-gateway.placeholder';

@Module({
  imports: [AuditModule, PermissionsModule],
  providers: [RealtimeGatewayPlaceholder],
  exports: [RealtimeGatewayPlaceholder],
})
export class RealtimeModule {}
