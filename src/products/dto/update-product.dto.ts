import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  cost_price?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  sale_price?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  stock_count?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  min_limit?: number;
}
