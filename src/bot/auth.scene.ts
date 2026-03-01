import { Injectable } from '@nestjs/common';
import { Ctx, Wizard, WizardStep, On } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { getMainMenuKeyboard } from './keyboards';

interface AuthWizardState extends Scenes.WizardSessionData {
  login?: string;
  password?: string;
}

type AuthWizardContext = Scenes.WizardContext<AuthWizardState>;

@Injectable()
@Wizard('auth')
export class AuthScene {
  constructor(private readonly prisma: PrismaService) {}

  @WizardStep(0)
  @On('text')
  async stepLogin(@Ctx() ctx: AuthWizardContext): Promise<string | void> {
    try {
      const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
      if (!text?.trim()) {
        return 'Iltimos, login kiriting.';
      }
      (ctx.wizard.state as AuthWizardState).login = text.trim();
      ctx.wizard.next();
      return 'Parolni kiriting:';
    } catch (err) {
      console.error('Auth stepLogin error:', err);
      await ctx.reply('Xatolik yuz berdi. Qaytadan urinib ko‘ring.').catch(() => {});
      await ctx.scene.leave();
    }
  }

  @WizardStep(1)
  @On('text')
  async stepPassword(@Ctx() ctx: AuthWizardContext): Promise<string | void> {
    try {
      const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
      if (!text?.trim()) {
        return 'Iltimos, parolni kiriting.';
      }
      (ctx.wizard.state as AuthWizardState).password = text.trim();
      await this.validateAndFinish(ctx);
    } catch (err) {
      console.error('Auth stepPassword error:', err);
      await ctx.reply('Xatolik yuz berdi. Qaytadan urinib ko‘ring.').catch(() => {});
      await ctx.scene.leave();
    }
  }

  private async validateAndFinish(ctx: AuthWizardContext): Promise<void> {
    const state = (ctx.wizard?.state ?? {}) as AuthWizardState;
    const login = state.login;
    const password = state.password;
    const tgId = ctx.from?.id?.toString();

    if (!login || !password || !tgId) {
      await ctx.reply('Login yoki parol kiritilmadi. Qaytadan /start bosing.').catch(() => {});
      await ctx.scene.leave();
      return;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { login, is_active: true },
      });
      if (!user) {
        await ctx.reply('Login yoki parol noto‘g‘ri.').catch(() => {});
        await ctx.scene.leave();
        return;
      }
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        await ctx.reply('Login yoki parol noto‘g‘ri.').catch(() => {});
        await ctx.scene.leave();
        return;
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: { tg_id: tgId },
      });
      await ctx.reply('Muvaffaqiyatli kirildi!', getMainMenuKeyboard()).catch(() => {});
      await ctx.scene.leave();
    } catch (err) {
      console.error('Auth validate error:', err);
      await ctx.reply('Xatolik yuz berdi. Qaytadan urinib ko‘ring.').catch(() => {});
      await ctx.scene.leave();
    }
  }
}
