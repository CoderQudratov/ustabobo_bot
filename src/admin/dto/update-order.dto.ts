import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminOrderItemEditDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  item_type: 'service' | 'product' | 'manual_product';

  @IsUUID()
  @IsOptional()
  service_id?: string;

  @IsUUID()
  @IsOptional()
  product_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  item_name?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price_at_time: number;
}

export class AdminUpdateOrderDto {
  @IsUUID()
  @IsOptional()
  master_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  client_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  client_phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  car_number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  car_model?: string;

  @IsUUID()
  @IsOptional()
  organization_id?: string | null;

  @IsUUID()
  @IsOptional()
  vehicle_id?: string | null;

  @IsBoolean()
  @IsOptional()
  delivery_needed?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminOrderItemEditDto)
  @IsOptional()
  order_items?: AdminOrderItemEditDto[];
}
