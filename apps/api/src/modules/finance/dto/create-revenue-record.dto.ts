import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRevenueRecordDto {
  @IsString()
  @MaxLength(80)
  sourceType!: string;

  @IsInt()
  @Min(0)
  amountCents!: number;

  @IsString()
  @MaxLength(3)
  currency!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  clientScopeKey?: string;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
