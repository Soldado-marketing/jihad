import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsIn(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'])
  status?: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';

  @IsOptional()
  @IsInt()
  @Min(0)
  paidCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  clientScopeKey?: string;
}

/**
 * Body for PATCH /invoices/:id/status.
 * A dedicated DTO so the status transition route validates its one field
 * instead of accepting an untyped object.
 */
export class UpdateInvoiceStatusDto {
  @IsIn(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'])
  status!: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';
}
