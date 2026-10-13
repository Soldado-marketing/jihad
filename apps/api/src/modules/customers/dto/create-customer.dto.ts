import { IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';
import { CLIENT_SCOPE_KEY_PATTERN } from '../../permissions/client-scope-assignment';

/** ADR-017: name and key are required; the key is immutable once created. */
export class CreateCustomerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @Matches(CLIENT_SCOPE_KEY_PATTERN, { message: 'clientScopeKey: 1-120 of letters, digits, dot, underscore, hyphen' })
  clientScopeKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  industry?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(300)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  responsibleUserId?: string;
}
