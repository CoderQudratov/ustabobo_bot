import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { AdminService, AdminRequestUser } from './admin.service';
import { AdminCreateProductDto } from './dto/create-product.dto';
import { AdminUpdateProductDto } from './dto/update-product.dto';
import { AdminStockInDto } from './dto/stock-in.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.boss)
export class AdminProductsController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  create(@Body() dto: AdminCreateProductDto, @Req() req: Request & { user: AdminRequestUser }) {
    return this.adminService.createProduct(dto, req.user);
  }

  @Get('low-stock')
  listLowStock(
    @Query() pagination?: PaginationDto,
    @Req() req?: Request & { user: AdminRequestUser },
  ) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 50;
    return this.adminService.getProductsLowStock(page, limit, req?.user);
  }

  @Get()
  list(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy')
    sortBy?: 'name' | 'cost_price' | 'sale_price' | 'stock_count',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Req() req?: Request & { user: AdminRequestUser },
  ) {
    const p = page != null ? Number(page) : 1;
    const l = limit != null ? Number(limit) : 50;
    return this.adminService.getProducts(p, l, { sortBy, sortOrder }, req?.user);
  }

  @Get(':id/price-history')
  getPriceHistory(
    @Param('id') id: string,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.getProductPriceHistory(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: AdminUpdateProductDto,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.updateProduct(id, dto, req.user?.id, req.user);
  }

  @Patch(':id/stock-in')
  stockIn(
    @Param('id') id: string,
    @Body() dto: AdminStockInDto,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.stockIn(id, dto, req.user?.id, req.user);
  }

  @Patch(':id/toggle-active')
  toggleActive(
    @Param('id') id: string,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.toggleProductActive(id, req.user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: Request & { user: AdminRequestUser }) {
    return this.adminService.deleteProduct(id, req.user);
  }
}
