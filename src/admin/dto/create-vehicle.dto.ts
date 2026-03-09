import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
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
