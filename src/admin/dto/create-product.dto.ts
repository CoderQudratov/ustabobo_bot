import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminCreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsUUID()
  supplier_id?: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  cost_price: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  sale_price?: number;

  /** Frontend ba'zan "selling_price" yuboradi */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  selling_price?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock_count: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  min_limit?: number;

  /** Frontend ba'zan "min_stock" yuboradi */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  min_stock?: number;
}
