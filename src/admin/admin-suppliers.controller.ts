import {
  Body,
  Controller,
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
import { AdminService } from './admin.service';
import { AdminCreateSupplierDto } from './dto/create-supplier.dto';
import { AdminUpdateSupplierDto } from './dto/update-supplier.dto';
import { AdminSupplierPaymentDto } from './dto/supplier-payment.dto';
import type { AdminRequestUser } from './admin.service';

@Controller('admin/suppliers')
@UseGuards(JwtAuthGuard)
export class AdminSuppliersController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  create(
    @Body() dto: AdminCreateSupplierDto,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.createSupplier(dto, req.user);
  }

  @Get()
  findAll(
    @Req() req: Request & { user: AdminRequestUser },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 50;
    return this.adminService.getSuppliers(p, l, req.user);
  }

  @Get('debt-summary')
  getDebtSummary(@Req() req: Request & { user: AdminRequestUser }) {
    return this.adminService.getSupplierDebtSummary(req.user);
  }

  @Get('all-purchases')
  getAllPurchases(@Req() req: Request & { user: AdminRequestUser }) {
    return this.adminService.getSuppliersAllPurchases(req.user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() _req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.getSupplierById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: AdminUpdateSupplierDto,
    @Req() _req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.updateSupplier(id, dto);
  }

  @Post(':id/payments')
  recordPayment(
    @Param('id') id: string,
    @Body() dto: AdminSupplierPaymentDto,
    @Req() req: Request & { user: AdminRequestUser },
  ) {
    return this.adminService.recordSupplierPayment(id, dto, req.user);
  }
}
