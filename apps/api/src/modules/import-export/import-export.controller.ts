import { Body, Controller, Get, Header, HttpCode, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { ImportCsvDto } from './dto/import.dto';
import { ImportExportService } from './import-export.service';

/**
 * CSV import/export (MAOS-T118). PERMISSION_CONTROLLED per type, decided in
 * the service from live permissions: export needs READ, import CREATE on
 * CUSTOMER / PROJECT / TASK. CLIENT has neither and is refused (403).
 */
@Controller('data')
@UseGuards(JwtAuthGuard)
export class ImportExportController {
  constructor(private readonly transfer: ImportExportService) {}

  @Get('export/:type')
  @Header('Cache-Control', 'no-store')
  async export(@CurrentUser() user: JwtPayload, @Param('type') type: string, @Res({ passthrough: true }) res: Response) {
    const out = await this.transfer.export({ sub: user.sub, tenantId: user.tenantId, role: user.role }, this.transfer.parseType(type));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    res.setHeader('X-Row-Count', String(out.rows));
    return out.csv;
  }

  /**
   * Always answers with the validation report: 200 when nothing was written
   * (check only, or the file has errors - see `valid` and `errors`), 201 when
   * commit=true and the whole file was written.
   */
  @Post('import/:type')
  @HttpCode(200)
  async import(@CurrentUser() user: JwtPayload, @Param('type') type: string, @Body() dto: ImportCsvDto, @Res({ passthrough: true }) res: Response) {
    const report = await this.transfer.import({ sub: user.sub, tenantId: user.tenantId, role: user.role }, this.transfer.parseType(type), dto.csv, dto.commit === true);
    if (report.committed) res.status(201);
    return report;
  }
}
