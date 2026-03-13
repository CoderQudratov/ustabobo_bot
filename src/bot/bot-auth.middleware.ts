import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Context } from 'telegraf';
import { Scenes } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';

const MSG_NO_ACCESS =
  "🚫 Siz tizimga kirishga ruxsat olmagan foydalanuvchisiz.\n📞 Admin bilan bog'laning.";
const MSG_BLOCKED = '🚫 Akkauntingiz bloklangan.';

@Injectable()
export class BotAuthMiddleware implements OnModuleInit {
  constructor(
    @InjectBot()
    private readonly bot: Telegraf,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await Promise.resolve();
    this.bot.use(async (ctx: Context, next) => {
      const fromId = ctx.from?.id;
      const msgText =
        ctx.message && 'text' in ctx.message
          ? (ctx.message as { text: string }).text
          : ctx.callbackQuery && 'data' in ctx.callbackQuery
            ? (ctx.callbackQuery as { data: string }).data
            : '';
      console.log(`[Bot] ${fromId ?? '?'} — ${msgText || '(no text)'}`);

      if (!fromId) return next();

      const text =
        ctx.message && 'text' in ctx.message
          ? ((ctx.message as { text: string }).text?.trim() ?? '')
          : '';
      if (text && /^\/?(start|help|logout)$/i.test(text)) return next();

      const sceneCtx = ctx as Scenes.SceneContext<Scenes.SceneSessionData>;
      if (sceneCtx.scene?.current?.id === 'auth') return next();

      const tgId = String(fromId);
      const user = await this.prisma.user.findFirst({
        where: { tg_id: tgId },
      });

      if (!user) {
        await ctx.reply(MSG_NO_ACCESS).catch(() => {});
        return;
      }
      if (!user.is_active) {
        await ctx.reply(MSG_BLOCKED).catch(() => {});
        return;
      }

      (ctx.state as { user?: typeof user }).user = user;
      return next();
    });
  }
}
