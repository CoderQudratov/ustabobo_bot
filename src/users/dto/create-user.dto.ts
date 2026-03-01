import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Role } from '../../../generated/prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullname: string;

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

  @IsNumber()
  @IsOptional()
  percent_rate?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
