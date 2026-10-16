import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { MAX_CSV_CHARS } from '../import-export.service';

export class ImportCsvDto {
  /** The whole CSV file as text (UTF-8). */
  @IsString()
  @MaxLength(MAX_CSV_CHARS)
  csv!: string;

  /** false (default): validate only and return the report. true: write a valid file. */
  @IsOptional()
  @IsBoolean()
  commit?: boolean;
}
