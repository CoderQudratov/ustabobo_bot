import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AdminCreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  plate_number: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  model: string;
}
