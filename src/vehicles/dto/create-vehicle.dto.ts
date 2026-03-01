import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateVehicleDto {
  @IsUUID()
  @IsNotEmpty()
  org_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  plate_number: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  model: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
