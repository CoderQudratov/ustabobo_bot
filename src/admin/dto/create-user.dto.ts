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
import { Role } from '../../../generated/prisma/client';

export class AdminCreateUserDto {
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

  @IsOptional()
  @IsNumber()
  @Min(0)
  percent_rate?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
