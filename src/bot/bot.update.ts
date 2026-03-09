import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Action, Ctx, Command, On, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Markup, Scenes } from 'telegraf';
import {
  getBossKeyboard,
  getDriverDeliveredInline,
  getDriverKeyboard,
  getDriverOrderInlineButton,
  getMainMenuKeyboard,
  getMasterFaolRefreshInline,
  getMasterKeyboard,
  getMasterTarixPaginationInline,
  DRIVER_DELIVERED_CB_REGEX,
  MASTER_TARIX_CB_REGEX,
} from './keyboards';
import {
  logBotError,
  userMessageWithCode,
  BOT_ERROR_CODES,
} from './bot-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { subDays } from 'date-fns';
import { OrderStatus } from '../../generated/prisma/client';
import { User } from '../../generated/prisma/client';
import { calculateOrderTotal } from '../orders/price-calculator';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

const FAOL_STATUS_LABELS: Record<string, string> = {
  waiting_confirmation: '⏳ Tasdiq kutmoqda',
  confirmed: '✅ Tasdiqlandi',
  in_progress: '🔧 Jarayonda',
  working: '🔧 Jarayonda',
  waiting_customer_confirmation: '👤 Mijoz kutmoqda',
  delivered_by_driver: '🚗 Yetkazildi',
  draft: '📝 Qoralama',
  waiting_master_work_start: '⏳ Usta ishni boshlashi',
  broadcasted: '📢 E\'lon qilindi',
  accepted: '✅ Qabul qilindi',
  received_by_driver: '📦 Kuryer oldi',
  waiting_master_delivery_confirmation: '⏳ Yetkazilishi tasdiqlanadi',
  received_by_master: '📦 Ustaga yetdi',
  completed: '✅ Yakunlandi',
  cancelled: '❌ Bekor qilindi',
};

@Update()
@Injectable()
export class BotUpdate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  private normalizeButtonText(raw: string): string {
    return raw.replace(/\s+/g, ' ').trim();
  }

  private isMasterButton(text: string, label: string): boolean {
    return this.normalizeButtonText(text) === this.normalizeButtonText(label);
  }

  private formatMoney(amount: number | null | undefined): string {
    if (amount == null) return '0';
    return Number(amount).toLocaleString('uz-UZ');
  }

  private formatDate(d: Date): string {
    return d
      .toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
      .replace(/\//g, '.');
  }

  /** Boss: bugungi hisobot (orders, revenue, active). */
  private async sendBossTodayReport(ctx: Context): Promise<void> {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setHours(23, 59, 59, 999);

    const [orders, revenue, activeOrders] = await Promise.all([
      this.prisma.order.count({
        where: { created_at: { gte: from, lte: to } },
      }),
      this.prisma.order.aggregate({
        where: {
          created_at: { gte: from, lte: to },
          status: OrderStatus.completed,
        },
        _sum: { total_amount: true },
      }),
      this.prisma.order.count({
        where: {
          status: { notIn: [OrderStatus.completed, OrderStatus.cancelled] },
        },
      }),
    ]);

    const totalAmount = revenue._sum?.total_amount ?? null;
    const text =
      '📊 Bugungi hisobot\n' +
      `📅 ${this.formatDate(new Date())}\n` +
      '─────────────────\n' +
      `📦 Jami buyurtma: ${orders} ta\n` +
      `⚡ Faol buyurtma: ${activeOrders} ta\n` +
      `💰 Daromad: ${this.formatMoney(Number(totalAmount))} so'm\n` +
      '─────────────────';

    await ctx.reply(text, getBossKeyboard()).catch(() => {});
  }

  /** Boss: haftalik hisobot (7 kun, eng faol usta). */
  private async sendBossWeekReport(ctx: Context): Promise<void> {
    const now = new Date();
    const from = subDays(now, 7);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now.getTime());

    const [orders, completed, cancelled, revenue, topMasters] = await Promise.all([
      this.prisma.order.count({
        where: { created_at: { gte: from, lte: to } },
      }),
      this.prisma.order.count({
        where: {
          created_at: { gte: from, lte: to },
          status: OrderStatus.completed,
        },
      }),
      this.prisma.order.count({
        where: {
          created_at: { gte: from, lte: to },
          status: OrderStatus.cancelled,
        },
      }),
      this.prisma.order.aggregate({
        where: {
          created_at: { gte: from, lte: to },
          status: OrderStatus.completed,
        },
        _sum: { total_amount: true },
      }),
      this.prisma.order.groupBy({
        by: ['master_id'],
        where: {
          created_at: { gte: from, lte: to },
          status: OrderStatus.completed,
        },
        _count: { id: true },
      }),
    ]);

    const totalAmount = revenue._sum?.total_amount ?? null;
    const fromStr = this.formatDate(from).slice(0, 5);
    const toStr = this.formatDate(to).slice(0, 5);
    const sorted = [...topMasters].sort((a, b) => b._count.id - a._count.id);
    let engFaol = '—';
    if (sorted.length > 0) {
      const master = await this.prisma.user.findUnique({
        where: { id: sorted[0].master_id },
        select: { fullname: true },
      });
      engFaol = master
        ? `${master.fullname} (${sorted[0]._count.id} ta buyurtma)`
        : '—';
    }

    const text =
      '📈 Haftalik hisobot\n' +
      `📅 ${fromStr} — ${toStr}\n` +
      '─────────────────\n' +
      `📦 Jami buyurtma: ${orders} ta\n` +
      `✅ Tugallangan: ${completed} ta\n` +
      `❌ Bekor: ${cancelled} ta\n` +
      `💰 Jami daromad: ${this.formatMoney(Number(totalAmount))} so'm\n` +
      `👤 Eng faol usta: ${engFaol}\n` +
      '─────────────────';

    await ctx.reply(text, getBossKeyboard()).catch(() => {});
  }

  /** Boss: xodimlar faolligi (oxirgi 7 kun). */
  private async sendBossStaffReport(ctx: Context): Promise<void> {
    const weekAgo = subDays(new Date(), 7);

    const users = await this.prisma.user.findMany({
      where: {
        role: { in: ['master', 'driver'] },
        is_active: true,
      },
      include: {
        ordersAsMaster: {
          where: { created_at: { gte: weekAgo } },
          select: { id: true },
        },
        ordersAsDriver: {
          where: { created_at: { gte: weekAgo } },
          select: { id: true },
        },
      },
    });

    const rows = users
      .map((u) => {
        const count =
          u.role === 'master'
            ? u.ordersAsMaster.length
            : u.ordersAsDriver.length;
        const icon = u.role === 'master' ? '👷' : '🚗';
        const label =
          u.role === 'master'
            ? `${count} ta buyurtma`
            : `${count} ta yetkazish`;
        return { fullname: u.fullname, icon, label, count };
      })
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);

    const lines = rows.map(
      (r, i) => `${i + 1}. ${r.icon} ${r.fullname} — ${r.label}`,
    );
    const text =
      '👥 Xodimlar (oxirgi 7 kun)\n' +
      '─────────────────\n' +
      (lines.length ? lines.join('\n') : 'Hozircha ma\'lumot yo\'q.') +
      '\n─────────────────';

    await ctx.reply(text, getBossKeyboard()).catch(() => {});
  }

  /** Boss: tashkilot qarzlari. */
  private async sendBossDebtsReport(ctx: Context): Promise<void> {
    const orgs = await this.prisma.organization.findMany({
      where: { balance_due: { gt: 0 } },
      orderBy: { balance_due: 'desc' },
    });

    const lines = orgs.map(
      (o, i) =>
        `${i + 1}. ${o.name} — ${this.formatMoney(Number(o.balance_due))} so'm ⚠️`,
    );
    const text =
      '🏢 Qarzdor tashkilotlar\n' +
      '─────────────────\n' +
      (lines.length ? lines.join('\n') : 'Qarzdor tashkilot yo\'q.') +
      '\n─────────────────';

    await ctx.reply(text, getBossKeyboard()).catch(() => {});
  }

  /** Boss: kam qolgan mahsulotlar (stock_count <= min_limit). */
  private async sendBossLowstockReport(ctx: Context): Promise<void> {
    const products = await this.prisma.product.findMany({
      where: { is_active: true },
    });
    const low = products.filter((p) => p.stock_count <= p.min_limit);

    const lines = low.map((p) => {
      const icon = p.stock_count === 0 ? '❗' : '⚠️';
      return `${icon} ${p.name} — ${p.stock_count} ta qoldi (min: ${p.min_limit})`;
    });
    const text =
      '📦 Kam qolgan mahsulotlar\n' +
      '─────────────────\n' +
      (lines.length ? lines.join('\n') : 'Barcha mahsulotlar yetarli.') +
      '\n─────────────────';

    await ctx.reply(text, getBossKeyboard()).catch(() => {});
  }

  /** Build and send master's statistics message. */
  private async sendMasterStats(ctx: Context, user: User): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = subDays(today, 7);

    const [todayOrders, weekOrders, allOrders] = await Promise.all([
      this.prisma.order.count({
        where: {
          master_id: user.id,
          created_at: { gte: today },
          status: OrderStatus.completed,
        },
      }),
      this.prisma.order.count({
        where: {
          master_id: user.id,
          created_at: { gte: weekStart },
          status: OrderStatus.completed,
        },
      }),
      this.prisma.order.aggregate({
        where: { master_id: user.id, status: OrderStatus.completed },
        _count: true,
        _sum: { total_amount: true },
      }),
    ]);

    const totalAmount = allOrders._sum?.total_amount ?? null;
    const text =
      '📊 Sizning statistikangiz\n\n' +
      `📅 Bugun: ${todayOrders} ta buyurtma\n` +
      `📆 Bu hafta: ${weekOrders} ta buyurtma\n` +
      `🏆 Jami: ${allOrders._count} ta buyurtma\n` +
      `💰 Jami daromad: ${this.formatMoney(Number(totalAmount))} so'm\n` +
      `📈 Foiz stavka: ${Number(user.percent_rate)}%\n` +
      `💵 Balans: ${this.formatMoney(Number(user.balance))} so'm`;

    await ctx.reply(text, getMasterKeyboard()).catch(() => {});
  }

  /** Format one driver order for Faol yetkazishlar (lat/lng if present). */
  private formatDriverOrderCard(order: {
    id: string;
    client_name: string;
    client_phone: string;
    lat: { toString(): string } | null;
    lng: { toString(): string } | null;
    total_amount: { toString(): string } | number;
  }): string {
    const idShort = order.id.replace(/-/g, '').slice(-8);
    const total = Number(order.total_amount).toLocaleString('uz-UZ');
    const manzil =
      order.lat != null && order.lng != null
        ? `${Number(order.lat).toFixed(5)}, ${Number(order.lng).toFixed(5)}`
        : '—';
    return (
      `🚗 Buyurtma #${idShort}\n` +
      `👤 Mijoz: ${order.client_name} — ${order.client_phone}\n` +
      `📍 Manzil: ${manzil}\n` +
      `💰 Summa: ${total} so'm`
    );
  }

  /** Send driver's faol yetkazishlar list (each order with [✅ Yetkazib bo'ldim]). */
  private async sendDriverFaolList(ctx: Context, user: User): Promise<void> {
    const orders = await this.prisma.order.findMany({
      where: {
        driver_id: user.id,
        status: {
          in: [
            OrderStatus.accepted,
            OrderStatus.received_by_driver,
            OrderStatus.delivered_by_driver,
          ],
        },
      },
      orderBy: { created_at: 'desc' },
    });

    if (orders.length === 0) {
      await ctx
        .reply("📭 Hozircha faol yetkazish yo'q.", getDriverKeyboard())
        .catch(() => {});
      return;
    }

    for (const order of orders) {
      const text = this.formatDriverOrderCard(order);
      await ctx
        .reply(text, getDriverDeliveredInline(order.id))
        .catch(() => {});
    }
  }

  private formatOrderStatus(status: string): string {
    return FAOL_STATUS_LABELS[status] ?? `📌 ${status}`;
  }

  private formatOrderCard(order: {
    id: string;
    client_name: string;
    client_phone: string;
    car_number: string;
    total_amount: { toString(): string } | number;
    status: string;
    created_at: Date;
  }): string {
    const W = 25;
    const line = (s: string) =>
      '│ ' + s.replace(/\n/g, ' ').slice(0, W).padEnd(W) + ' │';
    const idShort = order.id.replace(/-/g, '').slice(-8);
    const total = Number(order.total_amount).toLocaleString('uz-UZ');
    const date = new Date(order.created_at);
    const dateStr = date
      .toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
      .replace(/\//g, '.');
    const statusLabel = this.formatOrderStatus(order.status);
    return (
      '┌─────────────────────────┐\n' +
      line(`🔧 Buyurtma #${idShort}`) + '\n' +
      line(`👤 ${order.client_name} — ${order.client_phone}`) + '\n' +
      line(`🚗 ${order.car_number}`) + '\n' +
      line(`💰 ${total} so'm`) + '\n' +
      line(`📌 ${statusLabel}`) + '\n' +
      line(`🕐 ${dateStr}`) + '\n' +
      '└─────────────────────────┘'
    );
  }

  /** Build and send (or edit) master's faol buyurtmalar list. */
  private async sendMasterFaolList(
    ctx: Context,
    user: User,
    edit?: { chatId: number; messageId: number },
  ): Promise<void> {
    const orders = await this.prisma.order.findMany({
      where: {
        master_id: user.id,
        status: { notIn: [OrderStatus.completed, OrderStatus.cancelled] },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
      include: {
        orderItems: {
          include: { service: true, product: true },
        },
      },
    });

    const keyboard = getMasterFaolRefreshInline();
    const text = orders.length
      ? orders.map((o) => this.formatOrderCard(o)).join('\n\n')
      : "📭 Hozircha faol buyurtma yo'q.";

    if (edit) {
      await ctx.telegram
        .editMessageText(
          edit.chatId,
          edit.messageId,
          undefined,
          text,
          keyboard,
        )
        .catch(() => {});
    } else {
      await ctx.reply(text, keyboard).catch(() => {});
    }
  }

  private formatTarixOrderLine(
    order: {
      id: string;
      client_name: string;
      car_number: string;
      total_amount: { toString(): string } | number;
      status: string;
      created_at: Date;
    },
    index: number,
  ): string {
    const icon = order.status === 'completed' ? '✅' : '❌';
    const idShort = order.id.replace(/-/g, '').slice(-8);
    const total = Number(order.total_amount).toLocaleString('uz-UZ');
    const date = new Date(order.created_at);
    const dateStr = date
      .toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
      .replace(/\//g, '.');
    return (
      `${index}. ${icon} #${idShort} — ${order.client_name}\n` +
      `     🚗 ${order.car_number} | 💰 ${total} so'm\n` +
      `     📅 ${dateStr}`
    );
  }

  /** Build and send (or edit) master's buyurtmalar tarixi list with pagination. */
  private async sendMasterTarixList(
    ctx: Context,
    user: User,
    skip: number,
    edit?: { chatId: number; messageId: number },
  ): Promise<void> {
    const TAKE = 10;
    const orders = await this.prisma.order.findMany({
      where: {
        master_id: user.id,
        status: { in: [OrderStatus.completed, OrderStatus.cancelled] },
      },
      orderBy: { created_at: 'desc' },
      take: TAKE + 1,
      skip,
    });
    const hasNext = orders.length > TAKE;
    const list = orders.slice(0, TAKE);

    const lines = list.map((o, i) =>
      this.formatTarixOrderLine(o, skip + i + 1),
    );
    const text =
      '📜 So\'nggi 10 ta buyurtma:\n\n' +
      (lines.length ? lines.join('\n\n') : '📭 Buyurtma yo\'q.');

    const keyboard = getMasterTarixPaginationInline(skip, skip > 0, hasNext);

    if (edit) {
      await ctx.telegram
        .editMessageText(
          edit.chatId,
          edit.messageId,
          undefined,
          text,
          keyboard,
        )
        .catch(() => {});
    } else {
      await ctx.reply(text, keyboard).catch(() => {});
    }
  }

  /** Returns user if session valid (tg_id, is_active, last_authenticated_at within 8h); otherwise replies and returns null. */
  private async requireAuth(ctx: Context): Promise<User | null> {
    const tgId = ctx.from?.id?.toString();
    if (!tgId) return null;
    const user = await this.prisma.user.findFirst({
      where: { tg_id: tgId, is_active: true },
    });
    if (!user) return null;
    const at = user.last_authenticated_at;
    if (!at || Date.now() - new Date(at).getTime() > SESSION_TTL_MS) {
      await ctx.reply('Avval kirish (/start).').catch(() => {});
      return null;
    }
    return user;
  }

  @Action(DRIVER_DELIVERED_CB_REGEX)
  async onDriverDelivered(@Ctx() ctx: Context): Promise<void> {
    try {
      const user = await this.requireAuth(ctx);
      if (!user) {
        await ctx.answerCbQuery('Avval kirish (/start).').catch(() => {});
        return;
      }
      if (user.role !== 'driver') {
        await ctx.answerCbQuery('Ruxsat yo\'q.').catch(() => {});
        return;
      }
      const cb = ctx.callbackQuery as { data?: string } | undefined;
      const match = (cb?.data ?? '').match(DRIVER_DELIVERED_CB_REGEX);
      const orderId = match?.[1];
      if (!orderId) {
        await ctx.answerCbQuery('Noto\'g\'ri buyurtma.').catch(() => {});
        return;
      }
      await this.prisma.order.updateMany({
        where: { id: orderId, driver_id: user.id },
        data: { status: OrderStatus.delivered_by_driver },
      });
      await ctx.answerCbQuery('✅ Yetkazilindi!').catch(() => {});
      if (
        ctx.callbackQuery?.message &&
        'message_id' in ctx.callbackQuery.message
      ) {
        await ctx.editMessageText('✅ Yetkazilindi.').catch(() => {});
      }
    } catch (err) {
      logBotError(BOT_ERROR_CODES.TEXT, err, ctx);
      await ctx.answerCbQuery('Xatolik yuz berdi.').catch(() => {});
    }
  }

  @Action(MASTER_TARIX_CB_REGEX)
  async onMasterTarixPage(@Ctx() ctx: Context): Promise<void> {
    try {
      const user = await this.requireAuth(ctx);
      if (!user) {
        await ctx.answerCbQuery('Avval kirish (/start).').catch(() => {});
        return;
      }
      if (user.role !== 'master') {
        await ctx.answerCbQuery('Ruxsat yo\'q.').catch(() => {});
        return;
      }
      const cb = ctx.callbackQuery as { data?: string } | undefined;
      const match = (cb?.data ?? '').match(MASTER_TARIX_CB_REGEX);
      const skip = match ? parseInt(match[1], 10) : 0;
      const msg = ctx.callbackQuery?.message;
      const chatId = ctx.chat?.id;
      const messageId = msg && 'message_id' in msg ? msg.message_id : undefined;
      if (chatId == null || messageId == null) {
        await ctx.answerCbQuery('Xatolik.').catch(() => {});
        return;
      }
      await ctx.answerCbQuery('Yuklanmoqda…').catch(() => {});
      await this.sendMasterTarixList(ctx, user, skip, { chatId, messageId });
    } catch (err) {
      logBotError(BOT_ERROR_CODES.TEXT, err, ctx);
      await ctx.answerCbQuery('Xatolik yuz berdi.').catch(() => {});
    }
  }

  @Action('master_faol_refresh')
  async onMasterFaolRefresh(@Ctx() ctx: Context): Promise<void> {
    try {
      const user = await this.requireAuth(ctx);
      if (!user) {
        await ctx.answerCbQuery('Avval kirish (/start).').catch(() => {});
        return;
      }
      if (user.role !== 'master') {
        await ctx.answerCbQuery('Ruxsat yo\'q.').catch(() => {});
        return;
      }
      const msg = ctx.callbackQuery?.message;
      const chatId = ctx.chat?.id;
      const messageId = msg && 'message_id' in msg ? msg.message_id : undefined;
      if (chatId == null || messageId == null) {
        await ctx.answerCbQuery('Xatolik.').catch(() => {});
        return;
      }
      await ctx.answerCbQuery('Yangilanmoqda…').catch(() => {});
      await this.sendMasterFaolList(ctx, user, { chatId, messageId });
    } catch (err) {
      logBotError(BOT_ERROR_CODES.TEXT, err, ctx);
      await ctx.answerCbQuery('Xatolik yuz berdi.').catch(() => {});
    }
  }

  @Command('today')
  async onBossToday(@Ctx() ctx: Context): Promise<void> {
    const user = await this.requireAuth(ctx);
    if (!user) return;
    if (user.role !== 'boss') {
      await ctx.reply('Ruxsat yo\'q.').catch(() => {});
      return;
    }
    await this.sendBossTodayReport(ctx);
  }

  @Command('week')
  async onBossWeek(@Ctx() ctx: Context): Promise<void> {
    const user = await this.requireAuth(ctx);
    if (!user) return;
    if (user.role !== 'boss') {
      await ctx.reply('Ruxsat yo\'q.').catch(() => {});
      return;
    }
    await this.sendBossWeekReport(ctx);
  }

  @Command('staff')
  async onBossStaff(@Ctx() ctx: Context): Promise<void> {
    const user = await this.requireAuth(ctx);
    if (!user) return;
    if (user.role !== 'boss') {
      await ctx.reply('Ruxsat yo\'q.').catch(() => {});
      return;
    }
    await this.sendBossStaffReport(ctx);
  }

  @Command('debts')
  async onBossDebts(@Ctx() ctx: Context): Promise<void> {
    const user = await this.requireAuth(ctx);
    if (!user) return;
    if (user.role !== 'boss') {
      await ctx.reply('Ruxsat yo\'q.').catch(() => {});
      return;
    }
    await this.sendBossDebtsReport(ctx);
  }

  @Command('lowstock')
  async onBossLowstock(@Ctx() ctx: Context): Promise<void> {
    const user = await this.requireAuth(ctx);
    if (!user) return;
    if (user.role !== 'boss') {
      await ctx.reply('Ruxsat yo\'q.').catch(() => {});
      return;
    }
    await this.sendBossLowstockReport(ctx);
  }

  @Command('check')
  async onCheck(@Ctx() ctx: Context): Promise<void> {
    const devAdminId = process.env.DEV_ADMIN_TG_ID?.trim();
    const tgId = ctx.from?.id?.toString();
    // Silently ignore if not the dev admin — do not reveal this command exists
    if (!devAdminId || tgId !== devAdminId) return;

    if (!tgId) {
      await ctx.reply('Foydalanuvchi aniqlanmadi.').catch(() => {});
      return;
    }
    const user = await this.prisma.user.findFirst({
      where: { tg_id: tgId, is_active: true },
    });
    if (!user) {
      await ctx.reply('DB: user topilmadi.').catch(() => {});
      return;
    }
    const msg = [
      `last_authenticated_at: ${user.last_authenticated_at ? user.last_authenticated_at.toISOString() : 'null'}`,
      `password_fail_count: ${user.pin_fail_count}`,
      `locked_until: ${user.locked_until ? user.locked_until.toISOString() : 'null'}`,
    ].join('\n');
    await ctx.reply(msg).catch(() => {});
  }

  @Command('logout')
  async onLogout(@Ctx() ctx: Context): Promise<void> {
    const tgId = ctx.from?.id?.toString();
    if (!tgId) {
      await ctx.reply('Foydalanuvchi aniqlanmadi.').catch(() => {});
      return;
    }
    const sceneCtx = ctx as Scenes.SceneContext<Scenes.SceneSessionData>;
    if (sceneCtx.scene) {
      await sceneCtx.scene.leave().catch(() => {});
    }
    const user = await this.prisma.user.findFirst({
      where: { tg_id: tgId },
    });
    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          last_authenticated_at: null,
          is_authenticated: false,
        },
      });
    }
    await ctx
      .reply(
        '👋 Siz tizimdan chiqdingiz.\n\nQayta kirish uchun /start bosing.',
      )
      .catch(() => {});
  }

  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    try {
      const sceneCtx = ctx as Scenes.SceneContext<Scenes.SceneSessionData>;
      if (sceneCtx.scene) {
        await sceneCtx.scene.leave().catch(() => {});
        console.log('[Bot] /start – left any active scene');
      }

      // Deep link: /start conf_UUID (customer confirmation, TZ §§10–11)
      const payload = (ctx as Context & { startPayload?: string }).startPayload;
      if (payload && payload.startsWith('conf_')) {
        const token = payload.slice('conf_'.length);
        if (!token) {
          await ctx.reply('Noto‘g‘ri tasdiqlash linki.').catch(() => {});
          return;
        }
        try {
          // TZ §§11–13: customer confirmation must complete order, reduce stock, and apply finance in $transaction.
          const order = await this.ordersService.customerConfirm(token);
          await ctx
            .reply('✅ Xizmat muvaffaqiyatli tasdiqlandi! Rahmat.')
            .catch(() => {});

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
            await ctx
              .reply('Tasdiqlash tokeni eskirgan yoki noto‘g‘ri.')
              .catch(() => {});
          } else {
            logBotError(BOT_ERROR_CODES.START, err, ctx, {
              action: 'customerConfirm',
            });
            await ctx
              .reply(
                userMessageWithCode(
                  BOT_ERROR_CODES.START,
                  'Tasdiqlash jarayonida xatolik yuz berdi.',
                ),
              )
              .catch(() => {});
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
        const at = user.last_authenticated_at;
        const sessionValid =
          at && Date.now() - new Date(at).getTime() <= SESSION_TTL_MS;
        if (sessionValid) {
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
          return;
        }
      }

      // Not found or session expired: ask login (auth scene)
      if (sceneCtx.scene) {
        await sceneCtx.scene.enter('auth');
      } else {
        console.error('[Bot]', BOT_ERROR_CODES.START, {
          reason: 'scene_undefined',
          chatId: ctx.chat?.id,
          userId: tgId,
        });
        await ctx
          .reply(
            userMessageWithCode(
              BOT_ERROR_CODES.START,
              'Xatolik: sessiya ishlamayapti. Qaytadan urinib ko‘ring.',
            ),
          )
          .catch(() => {});
      }
    } catch (err) {
      logBotError(BOT_ERROR_CODES.START, err, ctx);
      await ctx
        .reply(userMessageWithCode(BOT_ERROR_CODES.START))
        .catch(() => {});
    }
  }

  @On('text')
  async onText(@Ctx() ctx: Context): Promise<void> {
    try {
      const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
      const tgId = ctx.from?.id?.toString();
      if (!tgId) return;

      const user = await this.requireAuth(ctx);
      if (!user) return;

      // Master menu buttons (PROMPT 3–5: placeholders for Faol/Tarix/Statistika; WebApp opens via button)
      if (user.role === 'master') {
        if (this.isMasterButton(text, '📋 Faol buyurtmalar')) {
          await this.sendMasterFaolList(ctx, user);
          return;
        }
        if (this.isMasterButton(text, '📜 Buyurtmalar tarixi')) {
          await this.sendMasterTarixList(ctx, user, 0);
          return;
        }
        if (this.isMasterButton(text, '📊 Mening statistikam')) {
          await this.sendMasterStats(ctx, user);
          return;
        }
      }

      // Driver menu buttons
      if (user.role === 'driver') {
        if (
          this.normalizeButtonText(text) === '🚗 Faol yetkazishlar' ||
          this.normalizeButtonText(text) === 'Faol yetkazishlar'
        ) {
          await this.sendDriverFaolList(ctx, user);
          return;
        }
        if (
          this.normalizeButtonText(text) === '📜 Yetkazish tarixi' ||
          this.normalizeButtonText(text) === 'Yetkazish tarixi'
        ) {
          await ctx
            .reply('📜 Yetkazish tarixi (tez orada).', getDriverKeyboard())
            .catch(() => {});
          return;
        }
      }

      // Boss menu buttons
      if (user.role === 'boss') {
        const n = this.normalizeButtonText(text);
        if (n === '📊 Bugungi hisobot' || n === 'Bugungi hisobot') {
          await this.sendBossTodayReport(ctx);
          return;
        }
        if (n === '📈 Haftalik hisobot' || n === 'Haftalik hisobot') {
          await this.sendBossWeekReport(ctx);
          return;
        }
        if (n === '👥 Xodimlar faolligi' || n === 'Xodimlar faolligi') {
          await this.sendBossStaffReport(ctx);
          return;
        }
        if (n === '🏢 Tashkilot qarzlari' || n === 'Tashkilot qarzlari') {
          await this.sendBossDebtsReport(ctx);
          return;
        }
        if (n === '📦 Kam qolgan mahsulotlar' || n === 'Kam qolgan mahsulotlar') {
          await this.sendBossLowstockReport(ctx);
          return;
        }
      }

      if (text === '📍 Lokatsiya yuborish') {
        await ctx
          .reply('Lokatsiyangizni yuboring (Share location).')
          .catch(() => {});
        return;
      }
      if (text === '📦 Qabul qildim') {
        await ctx.reply('“Qabul qildim” (keyingi versiyada).').catch(() => {});
        return;
      }
      if (text === '🔵 Ishni yakunlash') {
        await ctx
          .reply('“Ishni yakunlash” (keyingi versiyada).')
          .catch(() => {});
        return;
      }
    } catch (err) {
      logBotError(BOT_ERROR_CODES.TEXT, err, ctx);
      await ctx
        .reply(userMessageWithCode(BOT_ERROR_CODES.TEXT))
        .catch(() => {});
    }
  }

  @On('location')
  async onLocation(@Ctx() ctx: Context): Promise<void> {
    try {
      const user = await this.requireAuth(ctx);
      if (!user) return;
      const telegramId = ctx.from?.id;
      if (telegramId == null) return;
      const location =
        ctx.message && 'location' in ctx.message ? ctx.message.location : null;
      if (!location) {
        await ctx.reply('Lokatsiya olinmadi.').catch(() => {});
        return;
      }
      const draft = await this.prisma.order.findFirst({
        where: { master_id: user.id, status: OrderStatus.draft },
        orderBy: { created_at: 'desc' },
      });

      if (!draft) {
        await ctx
          .reply(
            'Aktiv draft buyurtma topilmadi. Avval yangi buyurtma yarating (WebApp).',
          )
          .catch(() => {});
        return;
      }

      if (!draft.delivery_needed) {
        await ctx
          .reply(
            'Bu buyurtma uchun yetkazib berish belgilanmagan. Iltimos, buyurtmani tasdiqlang.',
          )
          .catch(() => {});
        return;
      }

      const { latitude: lat, longitude: lng } = location;
      const result = await this.ordersService.addLocationToDraft(
        telegramId,
        lat,
        lng,
      );
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

      const total = calculateOrderTotal(
        order.orderItems.map((i) => ({
          item_type: i.item_type,
          price_at_time: Number(i.price_at_time),
          quantity: i.quantity,
        })),
        order.delivery_needed,
      );
      const totalFormatted = total.toLocaleString('uz-UZ');
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Tasdiqlash', `confirm_order_${orderId}`),
          Markup.button.callback('❌ Bekor qilish', `cancel_order_${orderId}`),
        ],
      ]);

      await ctx
        .reply(
          `📝 Buyurtma ma'lumotlari qabul qilindi.\n\n💰 Jami summa: ${totalFormatted} so'm\n\nTasdiqlaysizmi?`,
          keyboard,
        )
        .catch(() => {});
    } catch (err) {
      logBotError(BOT_ERROR_CODES.LOCATION, err, ctx);
      await ctx
        .reply(userMessageWithCode(BOT_ERROR_CODES.LOCATION))
        .catch(() => {});
    }
  }

  @Action(/^confirm_order_(.+)$/)
  async onConfirmOrder(@Ctx() ctx: Context): Promise<void> {
    try {
      const user = await this.requireAuth(ctx);
      if (!user) {
        await ctx.answerCbQuery('Avval kirish (/start).').catch(() => {});
        return;
      }
      const cb = ctx.callbackQuery as { data?: string } | undefined;
      const match = (cb?.data ?? '').match(/^confirm_order_(.+)$/);
      const orderId = match?.[1];
      if (!orderId) {
        await ctx.answerCbQuery('Noto‘g‘ri buyurtma.').catch(() => {});
        return;
      }
      await this.ordersService.confirm(orderId, user.id);
      await ctx.answerCbQuery('Tasdiqlandi!').catch(() => {});
      if (
        ctx.callbackQuery?.message &&
        'message_id' in ctx.callbackQuery.message
      ) {
        await ctx
          .editMessageText('✅ Buyurtmangiz tasdiqlandi!')
          .catch(() => {});
      }
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException ||
        err instanceof BadRequestException
      ) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Buyurtmani tasdiqlash mumkin emas.';
        await ctx.answerCbQuery(msg, { show_alert: true }).catch(() => {});
        if (
          ctx.callbackQuery?.message &&
          'message_id' in ctx.callbackQuery.message
        ) {
          await ctx.editMessageText(`❌ ${msg}`).catch(() => {});
        }
        return;
      }
      logBotError(BOT_ERROR_CODES.CONFIRM_ORDER, err, ctx);
      await ctx
        .answerCbQuery(userMessageWithCode(BOT_ERROR_CODES.CONFIRM_ORDER))
        .catch(() => {});
    }
  }

  @Action(/^cancel_order_(.+)$/)
  async onCancelOrder(@Ctx() ctx: Context): Promise<void> {
    try {
      const user = await this.requireAuth(ctx);
      if (!user) {
        await ctx.answerCbQuery('Avval kirish (/start).').catch(() => {});
        return;
      }
      const cb = ctx.callbackQuery as { data?: string } | undefined;
      const match = (cb?.data ?? '').match(/^cancel_order_(.+)$/);
      const orderId = match?.[1];
      if (!orderId) {
        await ctx.answerCbQuery('Noto‘g‘ri buyurtma.').catch(() => {});
        return;
      }
      await this.ordersService.cancelOrder(orderId, user.id);
      await ctx.answerCbQuery('Bekor qilindi.').catch(() => {});
      if (
        ctx.callbackQuery?.message &&
        'message_id' in ctx.callbackQuery.message
      ) {
        await ctx.editMessageText('❌ Buyurtma bekor qilindi.').catch(() => {});
      }
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException ||
        err instanceof BadRequestException
      ) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Buyurtmani bekor qilish mumkin emas.';
        await ctx.answerCbQuery(msg, { show_alert: true }).catch(() => {});
        return;
      }
      logBotError(BOT_ERROR_CODES.CANCEL_ORDER, err, ctx);
      await ctx
        .answerCbQuery(userMessageWithCode(BOT_ERROR_CODES.CANCEL_ORDER))
        .catch(() => {});
    }
  }

  @Action(/^accept_(.+)$/)
  async onAcceptOrder(@Ctx() ctx: Context): Promise<void> {
    try {
      const user = await this.requireAuth(ctx);
      if (!user) {
        await ctx.answerCbQuery('Avval kirish (/start).').catch(() => {});
        return;
      }
      const cb = ctx.callbackQuery as { data?: string } | undefined;
      const data = cb?.data ?? '';
      const orderId = data.startsWith('accept_') ? data.slice(7) : null;
      if (!orderId) {
        await ctx.answerCbQuery('Noto‘g‘ri buyurtma.').catch(() => {});
        return;
      }

      await this.ordersService.driverAccept(orderId, user.id);

      await ctx.answerCbQuery('Buyurtma qabul qilindi!').catch(() => {});

      // Edit the original broadcast message — add inline WebApp button pointing to THIS specific order
      if (
        ctx.callbackQuery?.message &&
        'message_id' in ctx.callbackQuery.message
      ) {
        await ctx
          .editMessageText(
            `✅ Buyurtma #${orderId.slice(-6).toUpperCase()} qabul qilindi!\n\nBuyurtma tafsilotlarini ko'rish va yetkazib berganingizni tasdiqlash uchun quyidagi tugmani bosing:`,
            getDriverOrderInlineButton(orderId),
          )
          .catch(() => {});
      }

      // Restore full driver menu keyboard at the bottom (NOT a standalone button)
      const driverTgId = ctx.from?.id;
      if (driverTgId != null) {
        await ctx.telegram
          .sendMessage(driverTgId, '📋 Menyu:', {
            reply_markup: getDriverKeyboard().reply_markup,
          })
          .catch(() => {});
      }
    } catch (err) {
      if (err instanceof ConflictException) {
        await ctx
          .answerCbQuery('Kech qoldingiz, boshqa kuryer oldi 😔', {
            show_alert: true,
          })
          .catch(() => {});
        if (
          ctx.callbackQuery?.message &&
          'message_id' in ctx.callbackQuery.message
        ) {
          await ctx
            .editMessageText(
              'Bu buyurtma boshqa kuryer tomonidan qabul qilindi.',
            )
            .catch(() => {});
        }
        return;
      }
      logBotError(BOT_ERROR_CODES.ACCEPT_ORDER, err, ctx);
      await ctx
        .answerCbQuery(userMessageWithCode(BOT_ERROR_CODES.ACCEPT_ORDER))
        .catch(() => {});
    }
  }

  @Action(/^confirm_delivery_(.+)$/)
  async onConfirmDelivery(@Ctx() ctx: Context): Promise<void> {
    try {
      const user = await this.requireAuth(ctx);
      if (!user) {
        await ctx.answerCbQuery('Avval kirish (/start).').catch(() => {});
        return;
      }
      const cb = ctx.callbackQuery as { data?: string } | undefined;
      const match = (cb?.data ?? '').match(/^confirm_delivery_(.+)$/);
      const orderId = match?.[1];
      if (!orderId) {
        await ctx.answerCbQuery('Noto‘g‘ri buyurtma.').catch(() => {});
        return;
      }
      await this.ordersService.masterConfirmDelivery(orderId, user.id, true);
      await ctx
        .answerCbQuery('Qabul qilindi. Ishni boshlashingiz mumkin.')
        .catch(() => {});
      if (
        ctx.callbackQuery?.message &&
        'message_id' in ctx.callbackQuery.message
      ) {
        await ctx
          .editMessageText('✅ Qabul qilindi. Ishni boshlashingiz mumkin.')
          .catch(() => {});
      }
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException ||
        err instanceof BadRequestException
      ) {
        const msg =
          err instanceof Error ? err.message : 'Amalni bajarish mumkin emas.';
        await ctx.answerCbQuery(msg, { show_alert: true }).catch(() => {});
        if (
          ctx.callbackQuery?.message &&
          'message_id' in ctx.callbackQuery.message
        ) {
          await ctx.editMessageText(`❌ ${msg}`).catch(() => {});
        }
        return;
      }
      logBotError(BOT_ERROR_CODES.CONFIRM_DELIVERY, err, ctx);
      await ctx
        .answerCbQuery(userMessageWithCode(BOT_ERROR_CODES.CONFIRM_DELIVERY))
        .catch(() => {});
    }
  }

  @Action(/^reject_delivery_(.+)$/)
  async onRejectDelivery(@Ctx() ctx: Context): Promise<void> {
    try {
      const user = await this.requireAuth(ctx);
      if (!user) {
        await ctx.answerCbQuery('Avval kirish (/start).').catch(() => {});
        return;
      }
      const cb = ctx.callbackQuery as { data?: string } | undefined;
      const match = (cb?.data ?? '').match(/^reject_delivery_(.+)$/);
      const orderId = match?.[1];
      if (!orderId) {
        await ctx.answerCbQuery('Noto‘g‘ri buyurtma.').catch(() => {});
        return;
      }
      await this.ordersService.masterConfirmDelivery(orderId, user.id, false);
      await ctx
        .answerCbQuery('Rad etildi. Kuryerga xabar yuborildi.')
        .catch(() => {});
      if (
        ctx.callbackQuery?.message &&
        'message_id' in ctx.callbackQuery.message
      ) {
        await ctx
          .editMessageText("❌ Rad etildi. Kuryer bilan bog'laning.")
          .catch(() => {});
      }
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException ||
        err instanceof BadRequestException
      ) {
        const msg =
          err instanceof Error ? err.message : 'Amalni bajarish mumkin emas.';
        await ctx.answerCbQuery(msg, { show_alert: true }).catch(() => {});
        return;
      }
      logBotError(BOT_ERROR_CODES.REJECT_DELIVERY, err, ctx);
      await ctx
        .answerCbQuery(userMessageWithCode(BOT_ERROR_CODES.REJECT_DELIVERY))
        .catch(() => {});
    }
  }

  @Action(/^start_work_(.+)$/)
  async onStartWork(@Ctx() ctx: Context): Promise<void> {
    try {
      const user = await this.requireAuth(ctx);
      if (!user) {
        await ctx.answerCbQuery('Avval kirish (/start).').catch(() => {});
        return;
      }
      const cb = ctx.callbackQuery as { data?: string } | undefined;
      const match = (cb?.data ?? '').match(/^start_work_(.+)$/);
      const orderId = match?.[1];
      if (!orderId) {
        await ctx.answerCbQuery('Noto‘g‘ri buyurtma.').catch(() => {});
        return;
      }
      await this.ordersService.masterStartWork(orderId, user.id);
      await ctx.answerCbQuery('Ish boshlandi!').catch(() => {});
      if (
        ctx.callbackQuery?.message &&
        'message_id' in ctx.callbackQuery.message
      ) {
        await ctx
          .editMessageText(
            '✅ Ish boshlandi. Yakunlash uchun WebApp-ga kiring.',
          )
          .catch(() => {});
      }
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException ||
        err instanceof BadRequestException
      ) {
        const msg =
          err instanceof Error ? err.message : 'Amalni bajarish mumkin emas.';
        await ctx.answerCbQuery(msg, { show_alert: true }).catch(() => {});
        return;
      }
      logBotError(BOT_ERROR_CODES.START_WORK, err, ctx);
      await ctx
        .answerCbQuery(userMessageWithCode(BOT_ERROR_CODES.START_WORK))
        .catch(() => {});
    }
  }

  @Action(/^decline_work_(.+)$/)
  async onDeclineWork(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery('Ishni boshlash bekor qilindi.').catch(() => {});
    if (
      ctx.callbackQuery?.message &&
      'message_id' in ctx.callbackQuery.message
    ) {
      await ctx
        .editMessageText('Ishni boshlash bekor qilindi.')
        .catch(() => {});
    }
  }
}
