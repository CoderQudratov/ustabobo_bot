import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaymentType } from '../../../generated/prisma/client';

export class AdminUpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contact_person?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEnum(PaymentType)
  payment_type?: PaymentType;

  @IsOptional()
  @IsNumber()
  balance_due?: number;
}
