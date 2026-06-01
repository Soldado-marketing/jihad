import { Module } from '@nestjs/common';
import { TenantContextController } from './tenant-context.controller';
import { TenantContextService } from './tenant-context.service';

@Module({
  controllers: [TenantContextController],
  exports: [TenantContextService],
  providers: [TenantContextService],
})
export class TenantContextModule {}
