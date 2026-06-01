import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateCostRecordDto {
  @IsString()
  @MaxLength(80)
  costType!: string;

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
  @MaxLength(160)
  vendorName?: string;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
