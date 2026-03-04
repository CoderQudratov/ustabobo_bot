import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { AdminService } from './admin.service';
import { AdminCreateProductDto } from './dto/create-product.dto';
import { AdminUpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminProductsController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  create(@Body() dto: AdminCreateProductDto) {
    return this.adminService.createProduct(dto);
  }

  @Get('low-stock')
  listLowStock(@Query() pagination?: PaginationDto) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 50;
    return this.adminService.getProductsLowStock(page, limit);
  }

  @Get()
  list(@Query() pagination?: PaginationDto) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 50;
    return this.adminService.getProducts(page, limit);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: AdminUpdateProductDto) {
    return this.adminService.updateProduct(id, dto);
  }
}
