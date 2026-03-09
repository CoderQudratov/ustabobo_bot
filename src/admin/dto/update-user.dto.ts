import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '../../../generated/prisma/client';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  login?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password?: string;

  @IsOptional()
  @IsIn([Role.boss, Role.master, Role.driver])
  role?: Role;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  percent_rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  commission?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
