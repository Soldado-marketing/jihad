import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { MyWorkController } from './my-work.controller';
import { MyWorkService } from './my-work.service';

@Module({
  imports: [PermissionsModule],
  controllers: [MyWorkController],
  providers: [MyWorkService],
})
export class MyWorkModule {}
