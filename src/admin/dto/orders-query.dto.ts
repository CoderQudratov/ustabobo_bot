import { IsOptional, IsString, IsUUID } from 'class-validator';
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

  @IsOptional()
  @IsString()
  search?: string;
}
