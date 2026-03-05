import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

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
  @IsBoolean()
  is_active?: boolean;
}
