import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import type { Telegraf } from 'telegraf';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../../generated/prisma/client';

@Injectable()
export class StockAlertService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  /**
   * After stock decrease: find products (by IDs) that are now low stock,
   * notify all boss users with tg_id. Non-blocking — errors are caught.
   */
  async checkAndAlert(productIds: string[]): Promise<void> {
    if (productIds.length === 0) return;

    try {
      const lowStock = await this.prisma.$queryRaw<
        { id: string; name: string; stock_count: number; min_limit: number }[]
      >(Prisma.sql`
        SELECT id, name, stock_count, min_limit
        FROM "Product"
        WHERE id = ANY(ARRAY[${Prisma.join(productIds)}]::uuid[])
          AND stock_count <= min_limit
          AND stock_count > 0
      `);
      if (lowStock.length === 0) return;

      const bosses = await this.prisma.user.findMany({
        where: { role: Role.boss, is_active: true },
        select: { tg_id: true },
      });
      const tgIds = bosses
        .map((u) => u.tg_id?.trim())
        .filter((id): id is string => !!id && /^\d+$/.test(id))
        .map((id) => Number(id));

      const lines = lowStock.map(
        (p) => `• ${p.name}: ${p.stock_count} ta qoldi (min: ${p.min_limit})`,
      );
      const text = [
        '⚠️ Ombor ogohlantirishi!',
        '',
        'Quyidagi zapchastlar tugayapti:',
        ...lines,
      ].join('\n');

      for (const chatId of tgIds) {
        if (Number.isFinite(chatId)) {
          await this.bot.telegram.sendMessage(chatId, text).catch(() => {});
        }
      }
    } catch {
      // Non-blocking: do not fail the order flow
    }
  }
}
