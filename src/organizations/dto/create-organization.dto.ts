import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaymentType } from '../../../generated/prisma/client';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contact_person: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phone: string;

  @IsEnum(PaymentType)
  payment_type: PaymentType;

  @IsNumber()
  @IsOptional()
  balance_due?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
