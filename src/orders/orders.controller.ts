import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { LocationDto } from './dto/location.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { MasterAuthGuard } from '../auth/guards/master-auth.guard';
import { Role } from '../../generated/prisma/client';

interface JwtUser {
  id: string;
  login: string;
  role: Role;
  fullname: string;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Public()
  @UseGuards(MasterAuthGuard, RolesGuard)
  @Roles(Role.master, Role.boss)
  createDraft(@Req() req: Request & { user: JwtUser }, @Body() dto: CreateOrderDto) {
    const masterId = req.user.id;
    return this.ordersService.createDraft(masterId, dto);
  }

  @Get('my/:telegramId')
  @Public()
  @UseGuards(MasterAuthGuard, RolesGuard)
  @Roles(Role.master, Role.boss)
  async getMyOrders(
    @Param('telegramId') telegramId: string,
    @Req() req: Request & { user: JwtUser },
  ) {
    const master = await this.ordersService.findMasterByTelegramId(telegramId);
    if (!master || master.id !== req.user.id) {
      throw new ForbiddenException('Access denied');
    }
    return this.ordersService.getMyOrders(telegramId);
  }

  @Patch(':id/cancel')
  @Public()
  @UseGuards(MasterAuthGuard, RolesGuard)
  @Roles(Role.master, Role.boss)
  async cancelOrder(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtUser },
    @Body() body: { telegramId?: string },
  ) {
    return this.ordersService.cancelOrder(id, req.user.id);
  }

  @Post(':id/location')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.master, Role.boss)
  setLocation(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtUser },
    @Body() dto: LocationDto,
  ) {
    return this.ordersService.setLocation(id, req.user.id, dto);
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.master, Role.boss)
  confirm(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    return this.ordersService.confirm(id, req.user.id);
  }

  @Post(':id/finish')
  @Public()
  @UseGuards(MasterAuthGuard, RolesGuard)
  @Roles(Role.master, Role.boss)
  async finish(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    const result = await this.ordersService.finish(id, req.user.id);
    const token = result?.confirm_token;
    if (!token) {
      throw new BadRequestException('Tasdiqlash tokeni yaratilmadi');
    }
    const username = String(process.env.TELEGRAM_BOT_USERNAME ?? '').trim();
    if (!username) {
      throw new InternalServerErrorException(
        'Tizim sozlanmagan: .env faylida TELEGRAM_BOT_USERNAME kiritilmagan. ' +
          'Developer: TELEGRAM_BOT_USERNAME ni .env ga qo‘shing (masalan: TELEGRAM_BOT_USERNAME=YourBotUserName).',
      );
    }
    const deep_link = `https://t.me/${username}?start=conf_${token}`;
    return { deep_link };
  }

  @Post(':id/receive')
  @Public()
  @UseGuards(MasterAuthGuard, RolesGuard)
  @Roles(Role.master, Role.boss)
  receive(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    return this.ordersService.receive(id, req.user.id);
  }
}
