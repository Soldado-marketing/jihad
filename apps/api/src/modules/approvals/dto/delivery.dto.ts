import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Staff sends one file version to the client for review, or resubmits after changes. */
export class SubmitDeliveryDto {
  @IsString()
  @MaxLength(64)
  fileAssetId!: string;

  @IsString()
  @MaxLength(64)
  fileVersionId!: string;

  /** Shown to the client under the company name, never the sender's. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

/** The client's answer to a delivery under review. */
export class ClientDeliveryDecisionDto {
  @IsIn(['APPROVE', 'REQUEST_CHANGES'])
  decision!: 'APPROVE' | 'REQUEST_CHANGES';

  /** Required when requesting changes: what should change. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
