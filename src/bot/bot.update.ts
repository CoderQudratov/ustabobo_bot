import { Injectable } from '@nestjs/common';
import { Ctx, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Scenes } from 'telegraf';
import { getMainMenuKeyboard } from './keyboards';
import { PrismaService } from '../prisma/prisma.service';

@Update()
@Injectable()
export class BotUpdate {
  constructor(private readonly prisma: PrismaService) {}

  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    try {
      const tgId = ctx.from?.id?.toString();
      if (!tgId) {
        await ctx.reply('Xatolik: foydalanuvchi aniqlanmadi.').catch(() => {});
        return;
      }
      const user = await this.prisma.user.findFirst({
        where: { tg_id: tgId, is_active: true },
      });
      if (user) {
        await ctx.reply('Asosiy menyu', getMainMenuKeyboard()).catch(() => {});
        return;
      }
      await (ctx as Scenes.SceneContext<Scenes.SceneSessionData>).scene.enter('auth');
      await ctx.reply('Botga kirish uchun login kiriting:').catch(() => {});
    } catch (err) {
      console.error('Start error:', err);
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
      // Placeholder: find active draft order for this master and call POST /orders/:id/location with lat, lng
      // await this.ordersService.setLocation(orderId, user.id, { lat, lng });
      console.log(`[Bot] Location from tg_id=${tgId} (user ${user.id}): lat=${lat}, lng=${lng} – placeholder: update draft order and call location API`);
      await ctx.reply('Lokatsiya qabul qilindi. (API ulanishi keyingi versiyada).').catch(() => {});
    } catch (err) {
      console.error('onLocation error:', err);
      await ctx.reply('Xatolik yuz berdi.').catch(() => {});
    }
  }
}
