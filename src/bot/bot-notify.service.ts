import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import type { Telegraf } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { getMasterOrderInlineButton } from './keyboards';

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
      await this.bot.telegram.sendMessage(
        chatId,
        "📝 Buyurtma ma'lumotlari qabul qilindi.\n\nTasdiqlaysizmi?",
        {
          reply_markup: confirmKeyboard.reply_markup,
        },
      );
    }
  }

  /** Send deep link to Master after "Ishni yakunlash" — they can Forward this message to customer. */
  async sendFinishLinkToMaster(
    masterTgId: string,
    deepLink: string,
  ): Promise<void> {
    const chatId = Number(masterTgId);
    if (!Number.isFinite(chatId)) return;
    const text = [
      '✅ Ish muvaffaqiyatli yakunlandi!',
      '',
      'Mijozga ulashish uchun tayyor link:',
      deepLink,
    ].join('\n');
    await this.bot.telegram.sendMessage(chatId, text).catch(() => {});
  }

  /** No-delivery: ask Master "Ishni boshlaysizmi?" with [Ha] [Yo'q]. If carPhotoUrl, send as photo with caption. */
  async sendWorkStartConfirmationRequest(
    masterTgId: string,
    orderId: string,
    carPhotoUrl?: string | null,
  ): Promise<void> {
    const chatId = Number(masterTgId);
    if (!Number.isFinite(chatId)) return;
    const text = '🛠 Ishni boshlaysizmi?';
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Ha', `start_work_${orderId}`)],
      [Markup.button.callback("❌ Yo'q", `decline_work_${orderId}`)],
    ]);
    const replyMarkup = { reply_markup: keyboard.reply_markup };
    if (carPhotoUrl?.trim()) {
      try {
        await this.bot.telegram.sendPhoto(chatId, carPhotoUrl.trim(), {
          caption: text,
          ...replyMarkup,
        });
        return;
      } catch {
        /* fallback to text */
      }
    }
    await this.bot.telegram
      .sendMessage(chatId, text, replyMarkup)
      .catch(() => {});
  }

  /**
   * Notifies master that work has started and provides inline WebApp button
   * to open the order directly. Called after masterStartWork() completes.
   * TZ §8.3 — master must receive one-tap navigation to order after status → working.
   */
  async sendWorkStartedToMaster(
    masterTgId: string,
    orderId: string,
  ): Promise<void> {
    const chatId = Number(masterTgId);
    if (!Number.isFinite(chatId)) return;
    const keyboard = getMasterOrderInlineButton(orderId);
    await this.bot.telegram
      .sendMessage(
        chatId,
        '✅ Ish boshlandi. Buyurtmani yakunlash uchun tugmani bosing:',
        { reply_markup: keyboard.reply_markup },
      )
      .catch(() => {});
  }

  /** Ask Master to confirm delivery. If carPhotoUrl, send as photo with caption; else text only. */
  async sendDeliveryConfirmationRequestToMaster(
    masterTgId: string,
    orderId: string,
    carPhotoUrl?: string | null,
  ): Promise<void> {
    const chatId = Number(masterTgId);
    if (!Number.isFinite(chatId)) return;
    const shortId = orderId.slice(0, 8);
    const text = `📦 Kuryer buyurtmani (#${shortId}) yetkazib berganini ma'lum qildi. Qabul qildingizmi?`;
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Ha', `confirm_delivery_${orderId}`)],
      [Markup.button.callback("❌ Yo'q", `reject_delivery_${orderId}`)],
    ]);
    const replyMarkup = { reply_markup: keyboard.reply_markup };
    if (carPhotoUrl?.trim()) {
      try {
        await this.bot.telegram.sendPhoto(chatId, carPhotoUrl.trim(), {
          caption: text,
          ...replyMarkup,
        });
        return;
      } catch {
        /* fallback to text */
      }
    }
    await this.bot.telegram
      .sendMessage(chatId, text, replyMarkup)
      .catch(() => {});
  }

  /**
   * Notifies master that delivery was confirmed and they can start work.
   * Provides inline WebApp button to open the order directly.
   * Called after masterConfirmDelivery() with confirmed=true.
   * TZ §9.1 — master must receive one-tap navigation to order after delivery confirmed.
   */
  async sendMasterCanStartWork(
    masterTgId: string,
    orderId: string,
  ): Promise<void> {
    const chatId = Number(masterTgId);
    if (!Number.isFinite(chatId)) return;
    const keyboard = getMasterOrderInlineButton(orderId);
    await this.bot.telegram
      .sendMessage(
        chatId,
        '✅ Yetkazib berish tasdiqlandi. Ishni boshlashingiz mumkin:',
        { reply_markup: keyboard.reply_markup },
      )
      .catch(() => {});
  }

  /** Notify Driver that master rejected delivery. */
  async sendDeliveryRejectedToDriver(driverTgId: string): Promise<void> {
    const chatId = Number(driverTgId);
    if (!Number.isFinite(chatId)) return;
    await this.bot.telegram
      .sendMessage(
        chatId,
        "❌ Usta qabul qilmadi, iltimos usta bilan bog'laning.",
      )
      .catch(() => {});
  }
}
