import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import type { Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';

/** Order shape needed for post-draft notification (from createDraft result). */
export interface DraftOrderForNotify {
  id: string;
  master_id: string;
  delivery_needed: boolean;
}

@Injectable()
export class BotNotifyService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  /**
   * Send proactive Telegram message right after a draft order is created (from WebApp).
   * Branches on delivery_needed: ask for location vs ask for confirmation with inline keyboard.
   */
  async sendMessageAfterDraft(order: DraftOrderForNotify): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: order.master_id },
      select: { tg_id: true },
    });
    const tgId = user?.tg_id?.trim();
    if (!tgId) {
      return; // master has no Telegram linked, skip
    }
    const chatId = Number(tgId);
    if (!Number.isFinite(chatId)) {
      return;
    }

    const confirmKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Tasdiqlash', `confirm_order_${order.id}`),
        Markup.button.callback('❌ Bekor qilish', `cancel_order_${order.id}`),
      ],
    ]);

    if (order.delivery_needed) {
      await this.bot.telegram.sendMessage(
        chatId,
        '📍 Yetkazib berish uchun manzilingizni (lokatsiya yoki text) yuboring:',
      );
    } else {
      await this.bot.telegram.sendMessage(chatId, "📝 Buyurtma ma'lumotlari qabul qilindi.\n\nTasdiqlaysizmi?", {
        reply_markup: confirmKeyboard.reply_markup,
      });
    }
  }
}
