import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [PermissionsModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
