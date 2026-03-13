import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AdminStockInDto {
  @IsNumber()
  @Min(1, { message: 'Miqdor 1 dan kam bo‘lmasligi kerak' })
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price_per_unit?: number;

  /** Taminotchi (postavchik) – berilsa qarz hisobga yoziladi */
  @IsOptional()
  @IsUUID()
  supplier_id?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
