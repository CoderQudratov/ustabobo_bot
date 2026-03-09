import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '../../../generated/prisma/client';

export class AdminCreateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullname?: string;

  /** Frontend ba'zan "name" yuboradi — ikkalasidan biri kerak */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(64)
  login: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsIn([Role.master, Role.driver])
  role: Role;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  percent_rate?: number;

  /** Frontend ba'zan "commission" yuboradi */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  commission?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
