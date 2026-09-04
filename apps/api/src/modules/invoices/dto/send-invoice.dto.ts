import { ArrayMaxSize, IsArray, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for POST /invoices/:id/send.
 *
 * Every field is optional: with no body at all, the invoice goes to the CLIENT
 * members of its project with a generated subject and message.
 */
export class SendInvoiceDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsEmail({}, { each: true })
  recipients?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;
}
