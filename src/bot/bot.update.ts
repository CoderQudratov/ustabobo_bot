import { ConflictException, Injectable } from '@nestjs/common';
import { Action, Ctx, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Scenes } from 'telegraf';
import { getMainMenuKeyboard } from './keyboards';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../../generated/prisma/client';

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
        await ctx.reply('Asosiy menyu', getMainMenuKeyboard()).catch(() => {});
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
      const tgId = ctx.from?.id?.toString();
      if (!tgId) {
        await ctx.reply('Xatolik: foydalanuvchi aniqlanmadi.').catch(() => {});
        return;
      }
      const user = await this.prisma.user.findFirst({
        where: { tg_id: tgId, is_active: true },
      });
      if (!user) {
        await ctx.reply('Avval /start orqali kirish qiling.').catch(() => {});
        return;
      }
      const location = ctx.message && 'location' in ctx.message ? ctx.message.location : null;
      if (!location) {
        await ctx.reply('Lokatsiya olinmadi.').catch(() => {});
        return;
      }
      const { latitude: lat, longitude: lng } = location;

      const draftOrder = await this.prisma.order.findFirst({
        where: { master_id: user.id, status: OrderStatus.draft },
        orderBy: { created_at: 'desc' },
      });

      if (!draftOrder) {
        await ctx.reply('Aktiv draft buyurtma topilmadi. Avval yangi buyurtma yarating (WebApp).').catch(() => {});
        return;
      }

      await this.ordersService.setLocation(draftOrder.id, user.id, { lat, lng });
      await ctx.reply('Lokatsiya qabul qilindi. Buyurtma tasdiqlashga tayyor.').catch(() => {});
    } catch (err) {
      console.error('onLocation error:', err);
      await ctx.reply('Xatolik yuz berdi. Qaytadan urinib ko‘ring.').catch(() => {});
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
}
