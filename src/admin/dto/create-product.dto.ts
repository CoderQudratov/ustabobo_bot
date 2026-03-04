import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class AdminCreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsNumber()
  @IsPositive()
  cost_price: number;

  @IsNumber()
  @IsPositive()
  sale_price: number;

  @IsInt()
  @Min(0)
  stock_count: number;

  @IsInt()
  @Min(0)
  min_limit: number;
}
