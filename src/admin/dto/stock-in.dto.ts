import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AdminStockInDto {
  @IsNumber()
  @Min(1, { message: 'Miqdor 1 dan kam bo‘lmasligi kerak' })
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price_per_unit?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
