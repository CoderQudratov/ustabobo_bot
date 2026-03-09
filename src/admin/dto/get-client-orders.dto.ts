import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class GetClientOrdersQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'phone parametri kiritilishi shart' })
  @Transform(({ value }) => {
    if (value == null) return '';
    const s = Array.isArray(value) ? value[0] : value;
    return String(s ?? '').trim().replace(/\D/g, '');
  })
  @Length(7, 20, {
    message: 'Telefon raqami kamida 7 ta raqamdan iborat bo‘lishi kerak',
  })
  @Matches(/^\d+$/, {
    message: 'Telefon raqami faqat raqamlardan iborat bo‘lishi kerak',
  })
  phone!: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
