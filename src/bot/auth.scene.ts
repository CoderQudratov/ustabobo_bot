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
import {
  getBossKeyboard,
  getDriverKeyboard,
  getMainMenuKeyboard,
  getMasterKeyboard,
} from './keyboards';
import {
  logBotError,
  userMessageWithCode,
  BOT_ERROR_CODES,
} from './bot-error.util';
import { Context } from 'telegraf';

interface AuthWizardState extends Scenes.WizardSessionData {
  login?: string;
  password?: string;
}

type AuthWizardContext = Scenes.WizardContext<AuthWizardState>;

const AUTH_LOG = '[Auth]';
const PASSWORD_MAX_FAIL = 3;
const LOCK_MINUTES = 30;
const NOT_ALLOWED_MSG =
  "🚫 Siz tizimga kirishga ruxsatga ega emassiz.\nAdmin bilan bog'laning.";

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

  /** Step 0: receive login; only admin-created users (existing in DB) may proceed. */
  @WizardStep(0)
  @On('text')
  async stepLogin(@Ctx() ctx: AuthWizardContext): Promise<string | void> {
    if (!ctx.wizard) return 'Login kiriting:';
    const text =
      ctx.message && 'text' in ctx.message
        ? (ctx.message as { text: string }).text
        : '';
    if (!text || !text.trim()) return 'Login kiriting:';
    const trimmed = text.trim();
    if (trimmed.startsWith('/')) {
      return 'Iltimos, loginni matn sifatida yuboring (buyruq emas).';
    }
    const user = await this.prisma.user.findUnique({
      where: { login: trimmed },
    });
    if (!user || !user.is_active) {
      await ctx.reply(NOT_ALLOWED_MSG).catch(() => {});
      await ctx.scene.leave().catch(() => {});
      return;
    }
    const state = (ctx.wizard.state || {}) as AuthWizardState;
    state.login = trimmed;
    ctx.wizard.next();
    return '🔒 Parol kiriting:';
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

  /** Step 1: receive password, validate with bcrypt, handle lock and fail count. */
  @WizardStep(1)
  @On('text')
  async stepPassword(@Ctx() ctx: AuthWizardContext): Promise<void> {
    const text =
      ctx.message && 'text' in ctx.message
        ? (ctx.message as { text: string }).text
        : '';
    if (!text || !text.trim()) {
      await ctx.reply('🔒 Parol kiriting:').catch(() => {});
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
      await ctx.reply('Sessiya tugadi. Qaytadan kirish.').catch(() => {});
      await (ctx.scene?.reenter() ?? Promise.resolve()).catch(() => {});
      return;
    }
    try {
      const user = await this.prisma.user.findUnique({
        where: { login },
      });
      if (!user || !user.is_active) {
        await ctx.reply(NOT_ALLOWED_MSG).catch(() => {});
        await ctx.scene.leave().catch(() => {});
        return;
      }
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const mins = Math.ceil(
          (new Date(user.locked_until).getTime() - Date.now()) / 60_000,
        );
        await ctx
          .reply(
            `🚫 30 daqiqa bloklandi. ${mins} daqiqa keyin qayta urinib ko'ring.`,
          )
          .catch(() => {});
        await (ctx.scene?.reenter() ?? Promise.resolve()).catch(() => {});
        return;
      }
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        const failCount = (user.pin_fail_count ?? 0) + 1;
        const lockUntil =
          failCount >= PASSWORD_MAX_FAIL
            ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
            : null;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { pin_fail_count: failCount, locked_until: lockUntil },
        });
        if (lockUntil) {
          await ctx.reply('🚫 30 daqiqa bloklandi').catch(() => {});
          await ctx.scene.leave().catch(() => {});
        } else {
          await ctx.reply('❌ Login yoki parol xato').catch(() => {});
          await ctx.reply('🔒 Parol kiriting:').catch(() => {});
        }
        return;
      }
      const tgId = ctx.from?.id?.toString();
      if (!tgId) {
        await ctx.reply('Xatolik: foydalanuvchi aniqlanmadi.').catch(() => {});
        return;
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          tg_id: tgId,
          is_authenticated: true,
          last_authenticated_at: new Date(),
          pin_fail_count: 0,
          locked_until: null,
        },
      });
      await ctx.scene.leave().catch(() => {});
      if (user.role === 'master') {
        await ctx
          .reply(
            `✅ Xush kelibsiz, ${user.fullname}!\n👷 Usta panel`,
            getMasterKeyboard(),
          )
          .catch(() => {});
      } else if (user.role === 'driver') {
        await ctx
          .reply(
            `✅ Xush kelibsiz, ${user.fullname}!\n🚗 Haydovchi panel`,
            getDriverKeyboard(),
          )
          .catch(() => {});
      } else if (user.role === 'boss') {
        await ctx
          .reply(
            `✅ Xush kelibsiz, ${user.fullname}!\n👑 Boss panel`,
            getBossKeyboard(),
          )
          .catch(() => {});
      } else {
        await ctx
          .reply('Menyu', getMainMenuKeyboard(user.role))
          .catch(() => {});
      }
    } catch (err) {
      logBotError(BOT_ERROR_CODES.AUTH_SCENE, err, ctx as Context, {
        step: 'password_validate',
        login: state.login ? `${state.login.slice(0, 2)}***` : undefined,
      });
      await ctx
        .reply(
          userMessageWithCode(
            BOT_ERROR_CODES.AUTH_SCENE,
            'Xatolik yuz berdi. Qaytadan kirish.',
          ),
        )
        .catch(() => {});
      await (ctx.scene?.reenter() ?? Promise.resolve()).catch(() => {});
    }
  }
}
