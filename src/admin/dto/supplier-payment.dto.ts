import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AdminSupplierPaymentDto {
  @IsNumber()
  @Min(0.01, { message: 'Summa 0 dan katta bo‘lishi kerak' })
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}
