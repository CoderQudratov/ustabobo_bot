import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { MasterAuthGuard } from '../auth/guards/master-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

interface JwtUser {
  id: string;
  login: string;
  role: Role;
  fullname: string;
}

@Controller('wallet')
@Public()
@UseGuards(MasterAuthGuard, RolesGuard)
@Roles(Role.driver, Role.master, Role.boss)
export class WalletController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getWallet(@Req() req: Request & { user: JwtUser }) {
    const userId = req.user.id;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });
    if (!user) {
      return { balance: 0, transactions: [] };
    }
    const balance = Number(user.balance);
    const transactions = await this.prisma.transaction.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        id: true,
        order_id: true,
        amount: true,
        type: true,
        created_at: true,
      },
    });
    return {
      balance,
      transactions: transactions.map((t) => ({
        id: t.id,
        order_id: t.order_id,
        amount: t.amount,
        type: t.type,
        created_at: t.created_at.toISOString(),
      })),
    };
  }
}
