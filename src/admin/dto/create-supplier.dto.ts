import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminCreateSupplierDto {
  @IsString()
  @MaxLength(255)
  fullname: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bank_account?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
