import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApprovalDecisionDto {
  @IsIn(['APPROVE', 'REJECT', 'REQUEST_CHANGES', 'CANCEL'])
  decision!: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'CANCEL';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
