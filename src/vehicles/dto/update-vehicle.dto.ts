import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateVehicleDto {
  @IsUUID()
  @IsOptional()
  org_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  plate_number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  model?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
