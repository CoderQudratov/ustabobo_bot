import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateServiceDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;
}
