import { IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

export class AdminOrdersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsUUID()
  master_id?: string;

  @IsOptional()
  @IsUUID()
  organization_id?: string;
}
