import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Multipart metadata that may accompany an upload.
 *
 * storageKey is deliberately ABSENT: object keys are generated server-side
 * (modules/storage/object-key.ts). Accepting a client-supplied key would let a
 * caller write outside its tenant namespace, so the field is not part of the
 * request contract. originalName and sizeBytes are likewise derived from the
 * uploaded part rather than trusted from the body.
 */
export class CreateFileVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
