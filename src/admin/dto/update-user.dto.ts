import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
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
  @IsIn([Role.master, Role.driver])
  role?: Role;

  @IsOptional()
  @IsNumber()
  @Min(0)
  percent_rate?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
