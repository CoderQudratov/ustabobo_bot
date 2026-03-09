import {
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  MinLength,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsDateString()
  plan_expires: string;

  @IsString()
  @IsNotEmpty()
  admin_name: string;

  @IsString()
  @IsNotEmpty()
  admin_login: string;

  @IsString()
  @MinLength(6)
  admin_password: string;

  /** Tenant boss uchun telefon (unique). Berilmasa avtomatik generatsiya qilinadi. */
  @IsString()
  @IsOptional()
  admin_phone?: string;
}

export class ExtendPlanDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  months: number;
}
