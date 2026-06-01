import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsInt()
  @Min(0)
  amountCents!: number;

  @IsString()
  @MaxLength(3)
  currency!: string;

  @IsOptional()
  @IsIn(['MANUAL', 'BANK_TRANSFER', 'CARD', 'CASH', 'OTHER'])
  method?: 'MANUAL' | 'BANK_TRANSFER' | 'CARD' | 'CASH' | 'OTHER';

  @IsOptional()
  @IsIn(['PENDING', 'RECORDED', 'PARTIAL', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELED'])
  status?: 'PENDING' | 'RECORDED' | 'PARTIAL' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELED';

  @IsOptional()
  @IsString()
  clientScopeKey?: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;
}
