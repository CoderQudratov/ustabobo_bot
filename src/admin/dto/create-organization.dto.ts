import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaymentType } from '../../../generated/prisma/client';

export class AdminCreateOrganizationDto {
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

  @IsOptional()
  @IsNumber()
  balance_due?: number;
}
