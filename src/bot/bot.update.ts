import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Action, Ctx, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Markup, Scenes } from 'telegraf';
import { getDriverOrderWebAppKeyboard, getDriverKeyboard, getMainMenuKeyboard, getMasterKeyboard } from './keyboards';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus, Role } from '../../generated/prisma/client';

const DELIVERY_FEE = 30_000;

@Update()
@Injectable()
export class BotUpdate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    try {
      const sceneCtx = ctx as Scenes.SceneContext<Scenes.SceneSessionData>;
      if (sceneCtx.scene) {
        await sceneCtx.scene.leave().catch(() => {});
        console.log('[Bot] /start – left any active scene');
      }

      // Deep link: /start conf_UUID (customer confirmation, TZ §§10–11)
      const payload = (ctx as any).startPayload as string | undefined;
      if (payload && payload.startsWith('conf_')) {
        const token = payload.slice('conf_'.length);
        if (!token) {
          await ctx.reply('Noto‘g‘ri tasdiqlash linki.').catch(() => {});
          return;
        }
        try {
          // TZ §§11–13: customer confirmation must complete order, reduce stock, and apply finance in $transaction.
          const order = await this.ordersService.customerConfirm(token);
          await ctx.reply('✅ Xizmat muvaffaqiyatli tasdiqlandi! Rahmat.').catch(() => {});

          if (order?.master?.id) {
            const master = await this.prisma.user.findUnique({
              where: { id: order.master.id },
            });
            if (master?.tg_id) {
              await ctx.telegram
                .sendMessage(
                  master.tg_id,
                  `🔔 Buyurtma #${order.id} mijoz tomonidan tasdiqlandi va yopildi.`,
                )
                .catch(() => {});
            }
          }
        } catch (err) {
          if (err instanceof NotFoundException) {
            await ctx.reply('Tasdiqlash tokeni eskirgan yoki noto‘g‘ri.').catch(() => {});
          } else {
            console.error('[Bot] conf_ start error:', err);
            await ctx.reply('Tasdiqlash jarayonida xatolik yuz berdi.').catch(() => {});
          }
        }
        return;
      }

      const tgId = ctx.from?.id?.toString();
      if (!tgId) {
        await ctx.reply('Xatolik: foydalanuvchi aniqlanmadi.').catch(() => {});
        return;
      }

      const user = await this.prisma.user.findFirst({
        where: { tg_id: tgId, is_active: true },
      });
      if (user) {
        console.log('[Bot] /start – already logged in, showing menu');
        await ctx.reply('Asosiy menyu', getMainMenuKeyboard(tgId, user.role)).catch(() => {});
        return;
      }

      if (sceneCtx.scene) {
        console.log('[Bot] /start – entering auth scene (first message from scene)');
        await sceneCtx.scene.enter('auth');
      } else {
        await ctx.reply('Xatolik: sessiya ishlamayapti. Qaytadan urinib ko‘ring.').catch(() => {});
      }
    } catch (err) {
      console.error('[Bot] Start error:', err);
      await ctx.reply('Xatolik yuz berdi. Qaytadan urinib ko‘ring.').catch(() => {});
    }
  }

  @On('text')
  async onText(@Ctx() ctx: Context): Promise<void> {
    try {
      const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
      const tgId = ctx.from?.id?.toString();
      if (!tgId) return;

      // Hidden developer commands: switch role and refresh menu (Phase 1 – Testing Utilities)
      if (text === '/be_driver' || text === '/be_master') {
        const user = await this.prisma.user.findFirst({
          where: { tg_id: tgId, is_active: true },
        });
        if (!user) {
          await ctx.reply('Avval /start orqali kirish qiling.').catch(() => {});
          return;
        }
        const newRole = text === '/be_driver' ? Role.driver : Role.master;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { role: newRole },
        });
        const roleLabel = newRole === Role.driver ? 'DRIVER' : 'MASTER';
        const keyboard = newRole === Role.driver ? getDriverKeyboard(tgId) : getMasterKeyboard(tgId);
        await ctx.reply(`Sizning rolingiz ${roleLabel} ga o'zgartirildi.`, keyboard).catch(() => {});
        return;
      }

      if (text === '📋 Buyurtmalarim') {
        await ctx.reply('Buyurtmalar ro‘yxati (keyingi versiyada).').catch(() => {});
        return;
      }
      if (text === '📍 Lokatsiya yuborish') {
        await ctx.reply('Lokatsiyangizni yuboring (Share location).').catch(() => {});
        return;
      }
      if (text === '📦 Qabul qildim') {
        await ctx.reply('“Qabul qildim” (keyingi versiyada).').catch(() => {});
        return;
      }
      if (text === '🔵 Ishni yakunlash') {
        await ctx.reply('“Ishni yakunlash” (keyingi versiyada).').catch(() => {});
        return;
      }
    } catch (err) {
      console.error('onText error:', err);
      await ctx.reply('Xatolik yuz berdi.').catch(() => {});
    }
  }

  @On('location')
  async onLocation(@Ctx() ctx: Context): Promise<void> {
    try {
      const telegramId = ctx.from?.id;
      if (telegramId == null) {
        await ctx.reply('Xatolik: foydalanuvchi aniqlanmadi.').catch(() => {});
        return;
      }
      const location = ctx.message && 'location' in ctx.message ? ctx.message.location : null;
      if (!location) {
        await ctx.reply('Lokatsiya olinmadi.').catch(() => {});
        return;
      }
      const tgIdStr = String(telegramId);
      const user = await this.prisma.user.findFirst({
        where: { tg_id: tgIdStr, is_active: true },
      });
      if (!user) {
        await ctx.reply('Avval /start orqali kirish qiling.').catch(() => {});
        return;
      }

      const draft = await this.prisma.order.findFirst({
        where: { master_id: user.id, status: OrderStatus.draft },
        orderBy: { created_at: 'desc' },
      });

      if (!draft) {
        await ctx.reply('Aktiv draft buyurtma topilmadi. Avval yangi buyurtma yarating (WebApp).').catch(() => {});
        return;
      }

      if (!draft.delivery_needed) {
        await ctx.reply(
          "Bu buyurtma uchun yetkazib berish belgilanmagan. Iltimos, buyurtmani tasdiqlang.",
        ).catch(() => {});
        return;
      }

      const { latitude: lat, longitude: lng } = location;
      const result = await this.ordersService.addLocationToDraft(telegramId, lat, lng);
      if (!result) {
        await ctx.reply('Xatolik: lokatsiya saqlanmadi.').catch(() => {});
        return;
      }

      const orderId = result.id;
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });
      if (!order) {
        await ctx.reply('Xatolik: buyurtma topilmadi.').catch(() => {});
        return;
      }

      const servicesSum = order.orderItems
        .filter((i) => i.item_type === 'service')
        .reduce((sum, i) => sum + Number(i.price_at_time) * i.quantity, 0);
      const productsSum = order.orderItems
        .filter((i) => i.item_type === 'product')
        .reduce((sum, i) => sum + Number(i.price_at_time) * i.quantity, 0);
      const manualSum = order.orderItems
        .filter((i) => i.item_type === 'manual_product')
        .reduce((sum, i) => sum + Number(i.price_at_time) * i.quantity, 0);

      const itemsTotal = servicesSum + productsSum + manualSum;
      const total = itemsTotal + (order.delivery_needed ? DELIVERY_FEE : 0);
      const totalFormatted = total.toLocaleString('uz-UZ');
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Tasdiqlash', `confirm_order_${orderId}`),
          Markup.button.callback('❌ Bekor qilish', `cancel_order_${orderId}`),
        ],
      ]);

      await ctx.reply(
        `📝 Buyurtma ma'lumotlari qabul qilindi.\n\n💰 Jami summa: ${totalFormatted} so'm\n\nTasdiqlaysizmi?`,
        keyboard,
      ).catch(() => {});
    } catch (err) {
      console.error('onLocation error:', err);
      await ctx.reply('Xatolik yuz berdi. Qaytadan urinib ko‘ring.').catch(() => {});
    }
  }

  @Action(/^confirm_order_(.+)$/)
  async onConfirmOrder(@Ctx() ctx: Context): Promise<void> {
    try {
      const tgId = ctx.from?.id?.toString();
      if (!tgId) {
        await ctx.answerCbQuery('Xatolik: foydalanuvchi aniqlanmadi.').catch(() => {});
        return;
      }
      const cb = ctx.callbackQuery as { data?: string } | undefined;
      const match = (cb?.data ?? '').match(/^confirm_order_(.+)$/);
      const orderId = match?.[1];
      if (!orderId) {
        await ctx.answerCbQuery('Noto‘g‘ri buyurtma.').catch(() => {});
        return;
      }
      const user = await this.prisma.user.findFirst({
        where: { tg_id: tgId, is_active: true },
      });
      if (!user) {
        await ctx.answerCbQuery('Avval /start orqali kirish qiling.').catch(() => {});
        return;
      }
      await this.ordersService.confirm(orderId, user.id);
      await ctx.answerCbQuery('Tasdiqlandi!').catch(() => {});
      if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
        await ctx.editMessageText('✅ Buyurtmangiz tasdiqlandi!').catch(() => {});
      }
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException || err instanceof BadRequestException) {
        const msg = err instanceof Error ? err.message : 'Buyurtmani tasdiqlash mumkin emas.';
        await ctx.answerCbQuery(msg, { show_alert: true }).catch(() => {});
        if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
          await ctx.editMessageText(`❌ ${msg}`).catch(() => {});
        }
        return;
      }
      console.error('onConfirmOrder error:', err);
      await ctx.answerCbQuery('Xatolik yuz berdi. Qaytadan urinib ko‘ring.').catch(() => {});
    }
  }

  @Action(/^cancel_order_(.+)$/)
  async onCancelOrder(@Ctx() ctx: Context): Promise<void> {
    try {
      const tgId = ctx.from?.id?.toString();
      if (!tgId) {
        await ctx.answerCbQuery('Xatolik: foydalanuvchi aniqlanmadi.').catch(() => {});
        return;
      }
      const cb = ctx.callbackQuery as { data?: string } | undefined;
      const match = (cb?.data ?? '').match(/^cancel_order_(.+)$/);
      const orderId = match?.[1];
      if (!orderId) {
        await ctx.answerCbQuery('Noto‘g‘ri buyurtma.').catch(() => {});
        return;
      }
      const user = await this.prisma.user.findFirst({
        where: { tg_id: tgId, is_active: true },
      });
      if (!user) {
        await ctx.answerCbQuery('Avval /start orqali kirish qiling.').catch(() => {});
        return;
      }
      await this.ordersService.cancelOrder(orderId, user.id);
      await ctx.answerCbQuery('Bekor qilindi.').catch(() => {});
      if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
        await ctx.editMessageText('❌ Buyurtma bekor qilindi.').catch(() => {});
      }
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException || err instanceof BadRequestException) {
        const msg = err instanceof Error ? err.message : 'Buyurtmani bekor qilish mumkin emas.';
        await ctx.answerCbQuery(msg, { show_alert: true }).catch(() => {});
        return;
      }
      console.error('onCancelOrder error:', err);
      await ctx.answerCbQuery('Xatolik yuz berdi. Qaytadan urinib ko‘ring.').catch(() => {});
    }
  }

  @Action(/^accept_(.+)$/)
  async onAcceptOrder(@Ctx() ctx: Context): Promise<void> {
    try {
      const tgId = ctx.from?.id?.toString();
      if (!tgId) {
        await ctx.answerCbQuery('Xatolik: foydalanuvchi aniqlanmadi.').catch(() => {});
        return;
      }

      const cb = ctx.callbackQuery as { data?: string } | undefined;
      const data = cb?.data ?? '';
      const orderId = data.startsWith('accept_') ? data.slice(7) : null;
      if (!orderId) {
        await ctx.answerCbQuery('Noto‘g‘ri buyurtma.').catch(() => {});
        return;
      }

      const user = await this.prisma.user.findFirst({
        where: { tg_id: tgId, is_active: true },
      });
      if (!user) {
        await ctx.answerCbQuery('Avval /start orqali kirish qiling.').catch(() => {});
        return;
      }

      await this.ordersService.driverAccept(orderId, user.id);

      await ctx.answerCbQuery('Buyurtma qabul qilindi!').catch(() => {});
      if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
        await ctx.editMessageText('Siz bu buyurtmani qabul qildingiz ✅').catch(() => {});
      }
      // Send driver a single message with only WebApp button (TZ: no intermediate "Qabul qildim" step)
      const driverTgId = ctx.from?.id;
      if (driverTgId != null) {
        const keyboard = getDriverOrderWebAppKeyboard(driverTgId);
        await ctx.telegram.sendMessage(driverTgId, '📦 Buyurtmani ochish uchun quyidagi tugmani bosing:', {
          reply_markup: keyboard.reply_markup,
        }).catch(() => {});
      }
    } catch (err) {
      if (err instanceof ConflictException) {
        await ctx.answerCbQuery('Kech qoldingiz, boshqa kuryer oldi 😔', { show_alert: true }).catch(() => {});
        if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
          await ctx.editMessageText('Bu buyurtma boshqa kuryer tomonidan qabul qilindi.').catch(() => {});
        }
        return;
      }
      console.error('onAcceptOrder error:', err);
      await ctx.answerCbQuery('Xatolik yuz berdi. Qaytadan urinib ko‘ring.').catch(() => {});
    }
  }

  @Action(/^confirm_delivery_(.+)$/)
  async onConfirmDelivery(@Ctx() ctx: Context): Promise<void> {
    try {
      const tgId = ctx.from?.id?.toString();
      if (!tgId) {
        await ctx.answerCbQuery('Xatolik: foydalanuvchi aniqlanmadi.').catch(() => {});
        return;
      }
      const cb = ctx.callbackQuery as { data?: string } | undefined;
      const match = (cb?.data ?? '').match(/^confirm_delivery_(.+)$/);
      const orderId = match?.[1];
      if (!orderId) {
        await ctx.answerCbQuery('Noto‘g‘ri buyurtma.').catch(() => {});
        return;
      }
      const user = await this.prisma.user.findFirst({
        where: { tg_id: tgId, is_active: true },
      });
      if (!user) {
        await ctx.answerCbQuery('Avval /start orqali kirish qiling.').catch(() => {});
        return;
      }
      await this.ordersService.masterConfirmDelivery(orderId, user.id, true);
      await ctx.answerCbQuery('Qabul qilindi. Ishni boshlashingiz mumkin.').catch(() => {});
      if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
        await ctx.editMessageText('✅ Qabul qilindi. Ishni boshlashingiz mumkin.').catch(() => {});
      }
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException || err instanceof BadRequestException) {
        const msg = err instanceof Error ? err.message : 'Amalni bajarish mumkin emas.';
        await ctx.answerCbQuery(msg, { show_alert: true }).catch(() => {});
        if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
          await ctx.editMessageText(`❌ ${msg}`).catch(() => {});
        }
        return;
      }
      console.error('onConfirmDelivery error:', err);
      await ctx.answerCbQuery('Xatolik yuz berdi.').catch(() => {});
    }
  }

  @Action(/^reject_delivery_(.+)$/)
  async onRejectDelivery(@Ctx() ctx: Context): Promise<void> {
    try {
      const tgId = ctx.from?.id?.toString();
      if (!tgId) {
        await ctx.answerCbQuery('Xatolik: foydalanuvchi aniqlanmadi.').catch(() => {});
        return;
      }
      const cb = ctx.callbackQuery as { data?: string } | undefined;
      const match = (cb?.data ?? '').match(/^reject_delivery_(.+)$/);
      const orderId = match?.[1];
      if (!orderId) {
        await ctx.answerCbQuery('Noto‘g‘ri buyurtma.').catch(() => {});
        return;
      }
      const user = await this.prisma.user.findFirst({
        where: { tg_id: tgId, is_active: true },
      });
      if (!user) {
        await ctx.answerCbQuery('Avval /start orqali kirish qiling.').catch(() => {});
        return;
      }
      await this.ordersService.masterConfirmDelivery(orderId, user.id, false);
      await ctx.answerCbQuery('Rad etildi. Kuryerga xabar yuborildi.').catch(() => {});
      if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
        await ctx.editMessageText("❌ Rad etildi. Kuryer bilan bog'laning.").catch(() => {});
      }
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException || err instanceof BadRequestException) {
        const msg = err instanceof Error ? err.message : 'Amalni bajarish mumkin emas.';
        await ctx.answerCbQuery(msg, { show_alert: true }).catch(() => {});
        return;
      }
      console.error('onRejectDelivery error:', err);
      await ctx.answerCbQuery('Xatolik yuz berdi.').catch(() => {});
    }
  }

  @Action(/^start_work_(.+)$/)
  async onStartWork(@Ctx() ctx: Context): Promise<void> {
    try {
      const tgId = ctx.from?.id?.toString();
      if (!tgId) {
        await ctx.answerCbQuery('Xatolik: foydalanuvchi aniqlanmadi.').catch(() => {});
        return;
      }
      const cb = ctx.callbackQuery as { data?: string } | undefined;
      const match = (cb?.data ?? '').match(/^start_work_(.+)$/);
      const orderId = match?.[1];
      if (!orderId) {
        await ctx.answerCbQuery('Noto‘g‘ri buyurtma.').catch(() => {});
        return;
      }
      const user = await this.prisma.user.findFirst({
        where: { tg_id: tgId, is_active: true },
      });
      if (!user) {
        await ctx.answerCbQuery('Avval /start orqali kirish qiling.').catch(() => {});
        return;
      }
      await this.ordersService.masterStartWork(orderId, user.id);
      await ctx.answerCbQuery('Ish boshlandi!').catch(() => {});
      if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
        await ctx.editMessageText('✅ Ish boshlandi. Yakunlash uchun WebApp-ga kiring.').catch(() => {});
      }
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException || err instanceof BadRequestException) {
        const msg = err instanceof Error ? err.message : 'Amalni bajarish mumkin emas.';
        await ctx.answerCbQuery(msg, { show_alert: true }).catch(() => {});
        return;
      }
      console.error('onStartWork error:', err);
      await ctx.answerCbQuery('Xatolik yuz berdi.').catch(() => {});
    }
  }

  @Action(/^decline_work_(.+)$/)
  async onDeclineWork(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery("Ishni boshlash bekor qilindi.").catch(() => {});
    if (ctx.callbackQuery?.message && 'message_id' in ctx.callbackQuery.message) {
      await ctx.editMessageText('Ishni boshlash bekor qilindi.').catch(() => {});
    }
  }
}
