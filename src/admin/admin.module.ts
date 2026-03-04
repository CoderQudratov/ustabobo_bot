import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { AdminService } from './admin.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminOrganizationsController } from './admin-organizations.controller';
import { AdminVehiclesController } from './admin-vehicles.controller';
import { AdminServicesController } from './admin-services.controller';
import { AdminProductsController } from './admin-products.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminReportsController } from './admin-reports.controller';
import { AdminDashboardController } from './admin-dashboard.controller';

@Module({
  imports: [PrismaModule, ProductsModule],
  controllers: [
    AdminUsersController,
    AdminOrganizationsController,
    AdminVehiclesController,
    AdminServicesController,
    AdminProductsController,
    AdminOrdersController,
    AdminReportsController,
    AdminDashboardController,
  ],
  providers: [AdminService],
})
export class AdminModule {}
