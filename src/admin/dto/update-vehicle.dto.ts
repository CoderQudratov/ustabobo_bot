import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminUpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  plate_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(1900, { message: 'Yil 1900–2030 orasida bo‘lishi kerak' })
  @Max(2030, { message: 'Yil 1900–2030 orasida bo‘lishi kerak' })
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vin?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
