import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  exports: [UsersService],
  imports: [PermissionsModule],
  providers: [UsersService],
})
export class UsersModule {}
