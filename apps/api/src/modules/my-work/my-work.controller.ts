import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { MyWorkService } from './my-work.service';

/**
 * Authorisation boundary: SELF, with per-section permission checks in the
 * service (each section uses the permission that normally reads it).
 */
@Controller('my-work')
@UseGuards(JwtAuthGuard)
export class MyWorkController {
  constructor(private readonly myWork: MyWorkService) {}

  @Get()
  overview(@CurrentUser() user: JwtPayload) {
    return this.myWork.overview(user);
  }
}
