import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectBot } from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import type { Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../../generated/prisma/client';
import { BROADCAST_JOB_NAME } from './broadcast-producer.service';

const DELIVERY_FEE = 30_000;

@Processor('broadcast_queue')
@Injectable()
export class BroadcastProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    @InjectBot() private readonly bot: Telegraf,
  ) {
    super();
  }

  async process(job: Job<{ orderId: string }>, _token?: string): Promise<void> {
    if (job.name !== BROADCAST_JOB_NAME || !job.data?.orderId) {
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: job.data.orderId },
      include: {
        master: true,
        orderItems: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      return;
    }

    const activeDrivers = await this.prisma.user.findMany({
      where: {
        role: Role.driver,
        is_active: true,
        tg_id: { not: null },
      },
    });

    const text = this.formatMessage(order);
    const keyboard = Markup.inlineKeyboard([
      Markup.button.callback('✅ Qabul qilish', 'accept_' + order.id),
    ]);

    const lat = order.lat != null ? Number(order.lat) : null;
    const lng = order.lng != null ? Number(order.lng) : null;

    for (const driver of activeDrivers) {
      const tgId = driver.tg_id;
      if (!tgId) continue;

      try {
        await this.bot.telegram.sendMessage(tgId, text, {
          parse_mode: 'HTML',
          reply_markup: keyboard.reply_markup,
        });
        if (lat != null && lng != null) {
          await this.bot.telegram.sendLocation(tgId, lat, lng);
        }
      } catch (err) {
        // Driver may have blocked the bot or left – do not crash the job
        // Optionally log: console.warn(`Failed to send broadcast to driver ${driver.id}:`, err);
      }
    }
  }

  private formatMessage(order: {
    master: { fullname: string; username: string | null };
    car_number: string;
    orderItems: Array<{
      item_type: string;
      quantity: number;
      item_name: string | null;
      product: { name: string } | null;
    }>;
    delivery_needed: boolean;
  }): string {
    const masterFullname = order.master.fullname;
    const masterUsername = order.master.username
      ? `@${order.master.username}`
      : '—';

    const partsLines: string[] = [];
    for (const item of order.orderItems) {
      if (item.item_type === 'product' && item.product) {
        partsLines.push(`• ${item.product.name} — ${item.quantity} шт`);
      } else if (item.item_type === 'manual_product' && item.item_name) {
        partsLines.push(`• ${item.item_name} — ${item.quantity} шт`);
      }
    }
    const partsBlock =
      partsLines.length > 0 ? partsLines.join('\n') : '—';

    const locationInfo = 'Lokatsiya pastda yuboriladi.';
    const deliveryFeeLine = order.delivery_needed
      ? `Yetkazish to'lovi: ${DELIVERY_FEE.toLocaleString()} so'm`
      : '';

    return [
      '📋 <b>Yangi buyurtma</b>',
      '',
      `Usta: <b>${escapeHtml(masterFullname)}</b>`,
      `Telegram: ${masterUsername}`,
      `Mashina raqami: ${escapeHtml(order.car_number)}`,
      '',
      '<b>Kerakli zapchastlar:</b>',
      partsBlock,
      '',
      locationInfo,
      deliveryFeeLine ? `\n${deliveryFeeLine}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
