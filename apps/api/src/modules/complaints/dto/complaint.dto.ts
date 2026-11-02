import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** A client reports a problem: a short subject and what happened. */
export class OpenComplaintDto {
  @IsString()
  @MinLength(3)
  @MaxLength(140)
  subject!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  body!: string;

  /** The delivery the problem is about, if any (checked against the client's own deliveries). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  deliveryId?: string;
}

/** A follow-up from the client on an open report. */
export class ClientReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

/** Management answers the client, or leaves a note only management can read. */
export class StaffReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  /** true: internal note, never shown to the client; false (default): an answer the client sees. */
  @IsOptional()
  @IsBoolean()
  internal?: boolean;
}
