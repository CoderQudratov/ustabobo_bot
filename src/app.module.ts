import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TelegramModule } from './telegram/telegram.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ServicesModule } from './services/services.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { BroadcastModule } from './broadcast/broadcast.module';
import { BotModule } from './bot/bot.module';
import { UploadModule } from './upload/upload.module';
import { AdminModule } from './admin/admin.module';
import { DebugModule } from './debug/debug.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

const imports = [
  PrismaModule,
  TelegramModule,
  BotModule,
  AuthModule,
  UsersModule,
  OrganizationsModule,
  VehiclesModule,
  ServicesModule,
  ProductsModule,
  OrdersModule,
  BroadcastModule,
  UploadModule,
  AdminModule,
];
if (process.env.NODE_ENV !== 'production') {
  imports.push(DebugModule);
}

@Module({
  imports,
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
