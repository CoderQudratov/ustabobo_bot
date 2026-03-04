import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class AdminUpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  cost_price?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  sale_price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock_count?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  min_limit?: number;
}
