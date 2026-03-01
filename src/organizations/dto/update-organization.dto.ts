import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaymentType } from '../../../generated/prisma/client';

export class UpdateOrganizationDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  contact_person?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsEnum(PaymentType)
  @IsOptional()
  payment_type?: PaymentType;

  @IsNumber()
  @IsOptional()
  balance_due?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
