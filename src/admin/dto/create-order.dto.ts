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

export class AdminProductItemDto {
  @IsUUID()
  product_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class AdminManualProductItemDto {
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

export class AdminCreateOrderDto {
  @IsUUID()
  master_id: string;

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
  @Type(() => AdminProductItemDto)
  @IsOptional()
  products?: AdminProductItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminManualProductItemDto)
  @IsOptional()
  manual_products?: AdminManualProductItemDto[];
}
