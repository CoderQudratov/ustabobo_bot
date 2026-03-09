import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminCreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  plate_number: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  model: string;

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
}
