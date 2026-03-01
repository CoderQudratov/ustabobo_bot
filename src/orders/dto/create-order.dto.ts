import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductItemDto {
  @IsUUID()
  product_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class ManualProductItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  client_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  client_phone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  car_number: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  car_model?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  car_photo_url?: string;

  @IsUUID()
  @IsOptional()
  organization_id?: string;

  @IsUUID()
  @IsOptional()
  vehicle_id?: string;

  @IsBoolean()
  delivery_needed: boolean;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  service_ids?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductItemDto)
  @IsOptional()
  products?: ProductItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualProductItemDto)
  @IsOptional()
  manual_products?: ManualProductItemDto[];
}
