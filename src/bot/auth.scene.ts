import { Injectable } from '@nestjs/common';
import {
  Ctx,
  Wizard,
  WizardStep,
  On,
  Command,
  SceneEnter,
} from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { getMainMenuKeyboard } from './keyboards';

interface AuthWizardState extends Scenes.WizardSessionData {
  login?: string;
  password?: string;
}

type AuthWizardContext = Scenes.WizardContext<AuthWizardState>;

const AUTH_LOG = '[Auth]';

@Injectable()
@Wizard('auth')
export class AuthScene {
  constructor(private readonly prisma: PrismaService) {}

  /** On scene enter: clear wizard state and ask for login (single source of first message). */
  @SceneEnter()
  async onEnter(@Ctx() ctx: AuthWizardContext): Promise<void> {
    if (!ctx.wizard) {
      console.warn(
        AUTH_LOG,
        'SceneEnter: ctx.wizard undefined (session may not be ready)',
      );
      await ctx.reply('Login kiriting:').catch(() => {});
      return;
    }
    const state = (ctx.wizard.state || {}) as AuthWizardState;
    state.login = undefined;
    state.password = undefined;
    if (typeof ctx.wizard.selectStep === 'function') {
      ctx.wizard.selectStep(0);
    } else {
      ctx.wizard.cursor = 0;
    }
    console.log(AUTH_LOG, 'Scene entered, state cleared, asking for login');
    await ctx.reply('Login kiriting:').catch(() => {});
  }

  /** If user sends /start while in wizard, leave and ask to restart */
  @Command('start')
  async onStartInWizard(@Ctx() ctx: AuthWizardContext): Promise<void> {
    console.log(
      AUTH_LOG,
      'Command /start received inside wizard – leaving scene',
    );
    await ctx.scene.leave().catch(() => {});
    await ctx
      .reply('Kirishni qaytadan boshlash uchun /start ni qayta bosing.')
      .catch(() => {});
  }

  /** Step 0: receive login, save to state, ask for password, move to step 1 */
  @WizardStep(0)
  @On('text')
  async stepLogin(@Ctx() ctx: AuthWizardContext): Promise<string | void> {
    if (!ctx.wizard) return 'Login kiriting:';
    const text =
      ctx.message && 'text' in ctx.message
        ? (ctx.message as { text: string }).text
        : '';
    console.log(
      AUTH_LOG,
      'Step 0 (login) received text:',
      text ? `${text.slice(0, 2)}***` : '(empty)',
    );

    if (!text || !text.trim()) {
      return 'Login kiriting:';
    }

    const trimmed = text.trim();
    if (trimmed.startsWith('/')) {
      return 'Iltimos, loginni matn sifatida yuboring (buyruq emas).';
    }

    const state = (ctx.wizard.state || {}) as AuthWizardState;
    state.login = trimmed;
    ctx.wizard.next();
    console.log(AUTH_LOG, 'Step 0 done, moved to step 1 (password)');
    return 'Parol kiriting:';
  }

  /** Step 1: receive password, validate with bcrypt, save tg_id, leave and show menu; on failure reenter */
  @WizardStep(1)
  @On('text')
  async stepPassword(@Ctx() ctx: AuthWizardContext): Promise<void> {
    const text =
      ctx.message && 'text' in ctx.message
        ? (ctx.message as { text: string }).text
        : '';
    console.log(
      AUTH_LOG,
      'Step 1 (password) received text:',
      text ? '***' : '(empty)',
    );

    if (!text || !text.trim()) {
      await ctx.reply('Parol kiriting:').catch(() => {});
      return;
    }

    if (!ctx.wizard) {
      await ctx.reply('Sessiya tugadi. Qaytadan kirish.').catch(() => {});
      await (ctx.scene?.reenter() ?? Promise.resolve()).catch(() => {});
      return;
    }
    const state = (ctx.wizard.state || {}) as AuthWizardState;
    const login = state.login;
    const password = text.trim();

    if (!login) {
      console.log(AUTH_LOG, 'Step 1: no login in state, reentering');
      await ctx.reply('Sessiya tugadi. Qaytadan kirish.').catch(() => {});
      await (ctx.scene?.reenter() ?? Promise.resolve()).catch(() => {});
      return;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { login, is_active: true },
      });
      if (!user) {
        console.log(AUTH_LOG, 'Step 1: user not found for login:', login);
        await ctx.reply('Login yoki parol noto‘g‘ri.').catch(() => {});
        await (ctx.scene?.reenter() ?? Promise.resolve()).catch(() => {});
        return;
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        console.log(AUTH_LOG, 'Step 1: password mismatch for login:', login);
        await ctx.reply('Login yoki parol noto‘g‘ri.').catch(() => {});
        await (ctx.scene?.reenter() ?? Promise.resolve()).catch(() => {});
        return;
      }

      const tgId = ctx.from?.id?.toString();
      if (!tgId) {
        await ctx.reply('Xatolik: foydalanuvchi aniqlanmadi.').catch(() => {});
        await (ctx.scene?.reenter() ?? Promise.resolve()).catch(() => {});
        return;
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { tg_id: tgId, is_authenticated: true },
      });
      console.log(AUTH_LOG, 'Login success, tg_id saved for user:', user.id);
      await ctx.scene.leave().catch(() => {});
      // Menu built from process.env.WEBAPP_URL at reply time — no stale links
      await ctx
        .reply('Muvaffaqiyatli kirildi!', getMainMenuKeyboard(user.role))
        .catch(() => {});
    } catch (err) {
      console.error(AUTH_LOG, 'Step 1 validate error:', err);
      await ctx.reply('Xatolik yuz berdi. Qaytadan kirish.').catch(() => {});
      await (ctx.scene?.reenter() ?? Promise.resolve()).catch(() => {});
    }
  }
}
