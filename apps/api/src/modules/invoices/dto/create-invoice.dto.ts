import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateInvoiceLineDto {
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  description!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsInt()
  @Min(0)
  unitAmountCents!: number;
}

export class CreateInvoiceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  invoiceNumber!: string;

  @IsString()
  @MaxLength(3)
  currency!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  clientScopeKey?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  // Required for nested validation. Without @Type the global ValidationPipe
  // (whitelist + forbidNonWhitelisted) has no metadata for the line objects and
  // rejects every one of their properties with "should not exist".
  @Type(() => CreateInvoiceLineDto)
  lines?: CreateInvoiceLineDto[];
}
