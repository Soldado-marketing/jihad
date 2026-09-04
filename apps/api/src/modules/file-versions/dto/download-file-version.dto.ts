import { IsIn, IsOptional } from 'class-validator';

/**
 * Query parameters for the content endpoint.
 *
 * 'inline' is a REQUEST, not a guarantee: the server downgrades it to
 * 'attachment' for any type that is not on the inline-safe allow-list
 * (see resolveDisposition in modules/storage/file-type.ts).
 */
export class DownloadFileVersionDto {
  @IsOptional()
  @IsIn(['inline', 'attachment'])
  disposition?: 'inline' | 'attachment';
}
