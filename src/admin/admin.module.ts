import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminOrganizationsController } from './admin-organizations.controller';
import { AdminVehiclesController } from './admin-vehicles.controller';
import { AdminServicesController } from './admin-services.controller';
import { AdminProductsController } from './admin-products.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminReportsController } from './admin-reports.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminSuppliersController } from './admin-suppliers.controller';
import { AdminMastersController } from './admin-masters.controller';

@Module({
  imports: [PrismaModule, ProductsModule],
  controllers: [
    AdminUsersController,
    AdminMastersController,
    AdminOrganizationsController,
    AdminVehiclesController,
    AdminServicesController,
    AdminProductsController,
    AdminOrdersController,
    AdminReportsController,
    AdminDashboardController,
    AdminSuppliersController,
  ],
  providers: [AdminService, AdminDashboardService, AuditService],
})
export class AdminModule {}
